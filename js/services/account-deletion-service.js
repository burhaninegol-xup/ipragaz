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
                willDeletePoints: false,
                totalPoints: 0,
                isOwner: user.role === 'owner',
                subUsers: [],
                needsOwnerSelection: false,
                autoPromoteUser: null
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

            // 4. Eger kullanici owner ise, alt kullanicilara gore senaryo belirle
            if (user.role === 'owner') {
                // Aktif alt kullanicilari (staff) getir
                const { data: activeSubUsers } = await supabaseClient
                    .from('customer_users')
                    .select('id, name, phone')
                    .eq('customer_id', user.customer_id)
                    .eq('is_active', true)
                    .neq('id', userId);

                var subUsers = activeSubUsers || [];
                impact.subUsers = subUsers;

                if (subUsers.length === 0) {
                    // Senaryo 1: Owner + 0 alt kullanici → her seyi sil
                    impact.willDeleteCustomer = true;
                    impact.willDeletePoints = true;
                } else if (subUsers.length === 1) {
                    // Senaryo 3: Owner + 1 alt kullanici → otomatik merkez yap
                    impact.willDeleteCustomer = false;
                    impact.autoPromoteUser = { id: subUsers[0].id, name: subUsers[0].name };
                } else {
                    // Senaryo 4: Owner + 2+ alt kullanici → secim yaptir
                    impact.willDeleteCustomer = false;
                    impact.needsOwnerSelection = true;
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
     * @param {string|null} newOwnerId - Yeni merkez kullanici yapilacak kullanici ID (opsiyonel)
     * @returns {Promise<{data: boolean, error: Object|null}>}
     */
    async executeAccountDeletion(userId, newOwnerId) {
        try {
            // Once etki analizini yap
            var impactResult = await this.calculateDeletionImpact(userId);
            if (impactResult.error || !impactResult.data) {
                return { data: false, error: impactResult.error };
            }

            var impact = impactResult.data;

            // Senaryo 1: Owner + 0 alt kullanici → her seyi sil (puanlar dahil)
            if (impact.willDeleteCustomer) {
                // 1a. Musterinin TUM subelerini soft-delete yap
                const { error: allBranchesError } = await supabaseClient
                    .from('customer_branches')
                    .update({ is_active: false })
                    .eq('customer_id', impact.customerId);

                if (allBranchesError) {
                    console.error('All branches deactivation error:', allBranchesError);
                }

                // 1b. Musterinin TUM kullanicilarini soft-delete yap
                const { error: allUsersError } = await supabaseClient
                    .from('customer_users')
                    .update({ is_active: false })
                    .eq('customer_id', impact.customerId);

                if (allUsersError) {
                    console.error('All users deactivation error:', allUsersError);
                }

                // 1c. Puanlari sil
                const { error: pointsError } = await supabaseClient
                    .from('customer_points')
                    .delete()
                    .eq('customer_id', impact.customerId);

                if (pointsError) {
                    console.error('Points deletion error:', pointsError);
                }

                // 1d. Musteri kaydini soft-delete yap
                const { error: customerError } = await supabaseClient
                    .from('customers')
                    .update({ is_active: false })
                    .eq('id', impact.customerId);

                if (customerError) {
                    console.error('Customer deactivation error:', customerError);
                }

                return { data: true, error: null };
            }

            // Senaryo 3/4: Owner + alt kullanici var → yeni owner ata
            var promoteUserId = newOwnerId || (impact.autoPromoteUser ? impact.autoPromoteUser.id : null);
            if (impact.isOwner && promoteUserId) {
                // Yeni owner'i ata
                const { error: promoteError } = await supabaseClient
                    .from('customer_users')
                    .update({ role: 'owner' })
                    .eq('id', promoteUserId);

                if (promoteError) {
                    console.error('Owner promotion error:', promoteError);
                    return { data: false, error: promoteError };
                }

                // Mevcut owner'in sube yetkilerini sil
                const { error: permError } = await supabaseClient
                    .from('customer_user_branches')
                    .delete()
                    .eq('customer_user_id', userId);

                if (permError) {
                    console.error('Permission deletion error:', permError);
                }

                // Mevcut owner'i tamamen sil (hard-delete)
                const { error: userError } = await supabaseClient
                    .from('customer_users')
                    .delete()
                    .eq('id', userId);

                if (userError) {
                    console.error('User deactivation error:', userError);
                    return { data: false, error: userError };
                }

                return { data: true, error: null };
            }

            // Senaryo 2: Staff kullanici → sadece kendini sil
            // Kullanici sube yetkilerini sil
            const { error: permError } = await supabaseClient
                .from('customer_user_branches')
                .delete()
                .eq('customer_user_id', userId);

            if (permError) {
                console.error('Permission deletion error:', permError);
            }

            // Kullanici kaydini tamamen sil (hard-delete)
            const { error: userError } = await supabaseClient
                .from('customer_users')
                .delete()
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
