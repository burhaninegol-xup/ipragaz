/**
 * Security Overlay Component
 * Merkezi guvenlik sorulari modulu - tum sayfalarda kullanilabilir
 */

var SecurityOverlay = (function() {
	// Private degiskenler
	var successCallback = null;
	var isInitialized = false;

	/**
	 * Component'i baslat - event listener'lari bagla
	 */
	function init() {
		if (isInitialized) return;

		// Radio degisikliklerini dinle
		document.querySelectorAll('input[name^="secQ"]').forEach(function(radio) {
			radio.addEventListener('change', updateProgress);
		});

		// Submit butonu
		var submitBtn = document.getElementById('securitySubmitBtn');
		if (submitBtn) {
			submitBtn.addEventListener('click', submit);
		}

		// Error overlay kapat butonu
		var errorCloseBtn = document.getElementById('securityErrorCloseBtn');
		if (errorCloseBtn) {
			errorCloseBtn.addEventListener('click', closeError);
		}

		// Overlay'e tiklaninca kapat
		var securityOverlay = document.getElementById('securityQuestionsOverlay');
		if (securityOverlay) {
			securityOverlay.addEventListener('click', function(e) {
				if (e.target === this) {
					close();
				}
			});
		}

		// Error overlay'e tiklaninca kapat
		var errorOverlay = document.getElementById('securityErrorOverlay');
		if (errorOverlay) {
			errorOverlay.addEventListener('click', function(e) {
				if (e.target === this) {
					closeError();
				}
			});
		}

		isInitialized = true;
	}

	/**
	 * Overlay'i goster
	 */
	function show() {
		// Onceki cevaplari temizle
		document.querySelectorAll('input[name^="secQ"]').forEach(function(radio) {
			radio.checked = false;
		});
		var checkbox = document.getElementById('securityAcceptCheckbox');
		if (checkbox) checkbox.checked = false;
		updateProgress();

		var overlay = document.getElementById('securityQuestionsOverlay');
		if (overlay) {
			overlay.classList.add('active');
			document.body.style.overflow = 'hidden';
		}
	}

	/**
	 * Overlay'i kapat
	 */
	function close() {
		var overlay = document.getElementById('securityQuestionsOverlay');
		if (overlay) {
			overlay.classList.remove('active');
			document.body.style.overflow = '';
		}
	}

	/**
	 * Progress bar'i guncelle
	 */
	function updateProgress() {
		var questions = ['secQ1', 'secQ2', 'secQ3', 'secQ4'];
		var answered = 0;
		questions.forEach(function(q) {
			if (document.querySelector('input[name="' + q + '"]:checked')) answered++;
		});
		var progress = (answered / 4) * 100;
		var fill = document.getElementById('securityProgressFill');
		if (fill) fill.style.width = progress + '%';
	}

	/**
	 * Cevaplari gonder
	 */
	async function submit() {
		var questions = ['secQ1', 'secQ2', 'secQ3', 'secQ4'];
		var answers = {};
		var allAnswered = true;
		var hasNoAnswer = false;

		questions.forEach(function(q, i) {
			var selected = document.querySelector('input[name="' + q + '"]:checked');
			if (!selected) {
				allAnswered = false;
			} else {
				answers['q' + (i + 1)] = selected.value === 'yes';
				if (selected.value === 'no') hasNoAnswer = true;
			}
		});

		if (!allAnswered) {
			alert('Lutfen tum sorulari cevaplayiniz.');
			return;
		}

		var checkbox = document.getElementById('securityAcceptCheckbox');
		if (!checkbox || !checkbox.checked) {
			alert('Lutfen beyanlarinizin dogrulugunu kabul ediniz.');
			return;
		}

		if (hasNoAnswer) {
			close();
			showError();
			return;
		}

		// Cevaplari kaydet
		var branchId = sessionStorage.getItem('selected_address_id');
		if (typeof BranchesService !== 'undefined') {
			var result = await BranchesService.updateSecurityAnswers(branchId, answers);

			if (result.error) {
				alert('Bir hata olustu. Lutfen tekrar deneyiniz.');
				return;
			}
		}

		close();

		// Callback varsa calistir
		if (typeof successCallback === 'function') {
			successCallback();
		}
	}

	/**
	 * Error overlay'i goster
	 */
	function showError() {
		var overlay = document.getElementById('securityErrorOverlay');
		if (overlay) {
			overlay.classList.add('active');
		}
	}

	/**
	 * Error overlay'i kapat
	 */
	function closeError() {
		var overlay = document.getElementById('securityErrorOverlay');
		if (overlay) {
			overlay.classList.remove('active');
			document.body.style.overflow = '';
		}
	}

	/**
	 * Guvenlik kontrolu yap - OK ise callback cagir
	 * @param {string} branchId - Sube ID
	 * @param {function} callback - Basarili olunca cagirilacak fonksiyon
	 */
	async function checkAndProceed(branchId, callback) {
		if (!branchId) {
			alert('Lutfen bir sube seciniz.');
			return;
		}

		// Callback'i sakla
		successCallback = callback;

		// BranchesService yuklu mu kontrol et
		if (typeof BranchesService === 'undefined') {
			console.error('BranchesService not loaded');
			// Service yoksa direkt devam et
			if (typeof callback === 'function') {
				callback();
			}
			return;
		}

		// Sube bilgisini al
		var branchResult = await BranchesService.getById(branchId);
		if (branchResult.error || !branchResult.data) {
			console.error('Branch bilgisi alinamadi');
			// Hata durumunda direkt devam et
			if (typeof callback === 'function') {
				callback();
			}
			return;
		}

		var branch = branchResult.data;

		// Guvenlik cevaplari var mi kontrol et
		var securityAnswers = branch.security_answers;

		if (securityAnswers &&
			securityAnswers.q1 === true &&
			securityAnswers.q2 === true &&
			securityAnswers.q3 === true &&
			securityAnswers.q4 === true) {
			// Guvenlik cevaplari zaten var ve hepsi Evet - direkt devam et
			if (typeof callback === 'function') {
				callback();
			}
		} else {
			// Guvenlik sorularini goster
			show();
		}
	}

	// Public API
	return {
		init: init,
		show: show,
		close: close,
		submit: submit,
		updateProgress: updateProgress,
		showError: showError,
		closeError: closeError,
		checkAndProceed: checkAndProceed
	};
})();

// Global erisim
window.SecurityOverlay = SecurityOverlay;
