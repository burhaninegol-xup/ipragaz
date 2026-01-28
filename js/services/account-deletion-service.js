/**
 * Account Deletion Service
 * Kullanici hesabini soft-delete yontemiyle silme servisi
 */

const AccountDeletionService = {
    /**
     * Silme etkisini hesapla (overlay icin)
     * @param {string} userId - Kullanici ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async calculateDeletionImpact(userId) {
        try {
            // 1. Kullanici bilgilerini al
            const { data: user, error: userError } = await supabaseClient
                .from('customer_users')
                .select(`
                    id,
                    name,
                    phone,
                    role,
                    customer_id,
                    customer:customers(id, name, is_active)
                `)
                .eq('id', userId)
                .single();

            if (userError || !user) {
                return { data: null, error: userError || { message: 'Kullanici bulunamadi' } };
            }

            var impact = {
                userId: userId,
                userName: user.name,
                userRole: user.role,
                customerId: user.customer_id,
                customerName: user.customer ? user.customer.name : '',
                branchesToDelete: [],
                branchesToKeep: [],
                willDeleteCustomer: false,
                totalPoints: 0,
                isOwner: user.role === 'owner'
            };

            // 2. Kullanicinin yetkili oldugu subeleri bul
            const { data: userBranches, error: branchError } = await supabaseClient
                .from('customer_user_branches')
                .select(`
                    id,
                    branch_id,
                    branch:customer_branches(id, branch_name, city, district, is_default, is_active)
                `)
                .eq('customer_user_id', userId);

            if (branchError) {
                return { data: null, error: branchError };
            }

            // 3. Her sube icin baska aktif kullanici var mi kontrol et
            for (var i = 0; i < (userBranches || []).length; i++) {
                var ub = userBranches[i];
                if (!ub.branch || !ub.branch.is_active) continue;

                // Bu subede baska aktif kullanici var mi?
                const { data: otherUsers, error: otherError } = await supabaseClient
                    .from('customer_user_branches')
                    .select(`
                        id,
                        customer_user:customer_users(id, is_active)
                    `)
                    .eq('branch_id', ub.branch_id)
                    .neq('customer_user_id', userId);

                if (otherError) continue;

                var hasOtherActiveUser = false;
                for (var j = 0; j < (otherUsers || []).length; j++) {
                    if (otherUsers[j].customer_user && otherUsers[j].customer_user.is_active) {
                        hasOtherActiveUser = true;
                        break;
                    }
                }

                var branchInfo = {
                    id: ub.branch.id,
                    name: ub.branch.branch_name,
                    city: ub.branch.city,
                    district: ub.branch.district,
                    isDefault: ub.branch.is_default
                };

                if (hasOtherActiveUser) {
                    impact.branchesToKeep.push(branchInfo);
                } else {
                    impact.branchesToDelete.push(branchInfo);
                }
            }

            // 4. Eger kullanici owner ise ve baska owner yoksa, musteri kaydini da sil
            if (user.role === 'owner') {
                // Baska aktif owner var mi kontrol et
                const { data: otherOwners } = await supabaseClient
                    .from('customer_users')
                    .select('id')
                    .eq('customer_id', user.customer_id)
                    .eq('role', 'owner')
                    .eq('is_active', true)
                    .neq('id', userId);

                var hasOtherOwner = otherOwners && otherOwners.length > 0;

                // Tek owner ise tum musteri kaydi silinecek
                if (!hasOtherOwner) {
                    impact.willDeleteCustomer = true;
                }
            }

            // 5. Toplam puanlari hesapla
            const { data: points } = await supabaseClient
                .from('customer_points')
                .select('points')
                .eq('customer_id', user.customer_id);

            if (points && points.length > 0) {
                impact.totalPoints = points.reduce(function(sum, p) {
                    return sum + (p.points || 0);
                }, 0);
            }

            return { data: impact, error: null };
        } catch (error) {
            console.error('calculateDeletionImpact error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Silme islemini gerceklestir
     * @param {string} userId - Kullanici ID
     * @returns {Promise<{data: boolean, error: Object|null}>}
     */
    async executeAccountDeletion(userId) {
        try {
            // Once etki analizini yap
            var impactResult = await this.calculateDeletionImpact(userId);
            if (impactResult.error || !impactResult.data) {
                return { data: false, error: impactResult.error };
            }

            var impact = impactResult.data;

            // 1. Silinecek subeleri soft-delete yap
            for (var i = 0; i < impact.branchesToDelete.length; i++) {
                var branch = impact.branchesToDelete[i];
                const { error: branchError } = await supabaseClient
                    .from('customer_branches')
                    .update({ is_active: false })
                    .eq('id', branch.id);

                if (branchError) {
                    console.error('Branch deactivation error:', branchError);
                }
            }

            // 2. Gerekirse musteri kaydini ve altindaki tum kayitlari soft-delete yap
            if (impact.willDeleteCustomer) {
                // 2a. Musterinin TUM subelerini soft-delete yap
                const { error: allBranchesError } = await supabaseClient
                    .from('customer_branches')
                    .update({ is_active: false })
                    .eq('customer_id', impact.customerId);

                if (allBranchesError) {
                    console.error('All branches deactivation error:', allBranchesError);
                }

                // 2b. Musterinin TUM kullanicilarini soft-delete yap
                const { error: allUsersError } = await supabaseClient
                    .from('customer_users')
                    .update({ is_active: false })
                    .eq('customer_id', impact.customerId);

                if (allUsersError) {
                    console.error('All users deactivation error:', allUsersError);
                }

                // 2c. Musteri kaydini soft-delete yap
                const { error: customerError } = await supabaseClient
                    .from('customers')
                    .update({ is_active: false })
                    .eq('id', impact.customerId);

                if (customerError) {
                    console.error('Customer deactivation error:', customerError);
                }

                // Not: Puanlar (customer_points) silinmiyor - musteriye bagli kalir
                // Zaten musteri is_active=false oldugu icin listelerde gorunmez

                return { data: true, error: null };
            }

            // 3. Kullanici sube yetkilerini sil
            const { error: permError } = await supabaseClient
                .from('customer_user_branches')
                .delete()
                .eq('customer_user_id', userId);

            if (permError) {
                console.error('Permission deletion error:', permError);
            }

            // 4. Kullanici kaydini soft-delete yap
            const { error: userError } = await supabaseClient
                .from('customer_users')
                .update({ is_active: false })
                .eq('id', userId);

            if (userError) {
                console.error('User deactivation error:', userError);
                return { data: false, error: userError };
            }

            return { data: true, error: null };
        } catch (error) {
            console.error('executeAccountDeletion error:', error);
            return { data: false, error: { message: error.message } };
        }
    }
};

// Global erisim
window.AccountDeletionService = AccountDeletionService;
