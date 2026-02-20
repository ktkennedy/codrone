/**
 * 저학년 드론 시뮬레이터 온보딩 튜토리얼
 * 단계별 인터랙티브 가이드 시스템
 */
(function() {
    'use strict';

    class OnboardingTutorial {
        constructor(options) {
            this.storageKey = options.storageKey || 'drone-tutorial-complete';
            this.onComplete = options.onComplete || null;
            this.currentStep = 0;
            this.isActive = false;
            this.elements = {};

            // 튜토리얼 단계 정의 (외부에서 steps 전달 시 사용, 없으면 기본값)
            this.steps = options.steps || [
                {
                    id: 'welcome',
                    title: '안녕! 드론 조종사가 되어볼까요?',
                    description: '재미있는 드론 모험이 기다리고 있어요!',
                    icon: '🚁',
                    buttonText: '시작하기',
                    highlightSelector: null,
                    waitForAction: null,
                    position: 'center'
                },
                {
                    id: 'takeoff',
                    title: '드론을 띄워보세요!',
                    description: '이 초록색 버튼을 눌러 드론을 하늘로 띄워보세요!',
                    icon: '🟢',
                    buttonText: null,
                    highlightSelector: '#btn-takeoff',
                    waitForAction: 'takeoff',
                    arrowDirection: 'top',
                    position: 'above'
                },
                {
                    id: 'direction',
                    title: '방향을 바꿔보세요!',
                    description: '화살표 버튼으로 드론을 움직여보세요!',
                    icon: '🎮',
                    buttonText: null,
                    highlightSelector: '.dpad',
                    waitForAction: 'direction',
                    arrowDirection: 'bottom',
                    position: 'above'
                },
                {
                    id: 'altitude',
                    title: '높이를 조절해보세요!',
                    description: '드론을 높이 올리거나 낮출 수 있어요!',
                    icon: '⬆️',
                    buttonText: null,
                    highlightSelector: '.vertical-controls',
                    waitForAction: 'altitude',
                    arrowDirection: 'right',
                    position: 'right'
                },
                {
                    id: 'land',
                    title: '안전하게 착륙해보세요!',
                    description: '이제 드론을 착륙시켜볼까요?',
                    icon: '🟠',
                    buttonText: null,
                    highlightSelector: '#btn-land',
                    waitForAction: 'land',
                    arrowDirection: 'top',
                    position: 'above'
                },
                {
                    id: 'complete',
                    title: '잘했어요! 🎉',
                    description: '이제 미션에 도전해볼까요?',
                    icon: '🏆',
                    buttonText: '미션 시작',
                    highlightSelector: '#btn-mission',
                    waitForAction: null,
                    arrowDirection: 'bottom',
                    position: 'center'
                }
            ];
        }

        /**
         * 튜토리얼이 이미 완료되었는지 확인
         */
        isCompleted() {
            try {
                return localStorage.getItem(this.storageKey) === 'true';
            } catch (e) {
                return false;
            }
        }

        /**
         * 튜토리얼 완료 상태 저장
         */
        markCompleted() {
            try {
                localStorage.setItem(this.storageKey, 'true');
            } catch (e) {
                console.warn('Could not save tutorial completion state');
            }
        }

        /**
         * 튜토리얼 시작
         */
        start() {
            if (this.isCompleted()) {
                console.log('Tutorial already completed, skipping');
                return;
            }

            this.isActive = true;
            this.currentStep = 0;
            this._createUI();
            this._setupEventListeners();
            this._showStep(0);
        }

        /**
         * UI 요소 생성
         */
        _createUI() {
            // 오버레이
            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay-new';
            overlay.className = 'tutorial-overlay';
            this.elements.overlay = overlay;

            // 스포트라이트 (하이라이트된 요소 뒤)
            const spotlight = document.createElement('div');
            spotlight.id = 'tutorial-spotlight';
            spotlight.className = 'tutorial-spotlight';
            this.elements.spotlight = spotlight;

            // 말풍선
            const bubble = document.createElement('div');
            bubble.id = 'tutorial-bubble';
            bubble.className = 'tutorial-bubble';
            bubble.innerHTML = `
                <div class="tutorial-icon"></div>
                <div class="tutorial-content">
                    <h3 class="tutorial-title"></h3>
                    <p class="tutorial-description"></p>
                </div>
                <button class="tutorial-next-btn"></button>
                <div class="tutorial-dots"></div>
            `;
            this.elements.bubble = bubble;

            // 화살표
            const arrow = document.createElement('div');
            arrow.id = 'tutorial-arrow';
            arrow.className = 'tutorial-arrow';
            this.elements.arrow = arrow;

            // 건너뛰기 버튼
            const skipBtn = document.createElement('button');
            skipBtn.id = 'tutorial-skip';
            skipBtn.className = 'tutorial-skip-btn';
            skipBtn.textContent = '건너뛰기';
            skipBtn.addEventListener('click', () => this._skip());
            this.elements.skipBtn = skipBtn;

            // DOM에 추가
            document.body.appendChild(overlay);
            document.body.appendChild(spotlight);
            document.body.appendChild(bubble);
            document.body.appendChild(arrow);
            document.body.appendChild(skipBtn);
        }

        /**
         * 이벤트 리스너 설정
         */
        _setupEventListeners() {
            // 다음 버튼
            const nextBtn = this.elements.bubble.querySelector('.tutorial-next-btn');
            nextBtn.addEventListener('click', () => this._handleNext());
            nextBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._handleNext();
            });
        }

        /**
         * 특정 단계 표시
         */
        _showStep(stepIndex) {
            if (stepIndex >= this.steps.length) {
                this._complete();
                return;
            }

            this.currentStep = stepIndex;
            const step = this.steps[stepIndex];

            // 아이콘, 제목, 설명 업데이트
            const icon = this.elements.bubble.querySelector('.tutorial-icon');
            const title = this.elements.bubble.querySelector('.tutorial-title');
            const description = this.elements.bubble.querySelector('.tutorial-description');
            const nextBtn = this.elements.bubble.querySelector('.tutorial-next-btn');

            icon.textContent = step.icon;
            title.textContent = step.title;
            description.textContent = step.description;

            // 다음 버튼 표시/숨김
            if (step.buttonText) {
                nextBtn.textContent = step.buttonText;
                nextBtn.style.display = 'block';
            } else {
                nextBtn.style.display = 'none';
            }

            // 진행 표시 점
            this._updateDots();

            // 하이라이트 업데이트
            if (step.highlightSelector) {
                this._highlightElement(step.highlightSelector, step.position, step.arrowDirection);
            } else {
                this._clearHighlight();
            }

            // 액션 대기
            if (step.waitForAction) {
                this._waitForAction(step.waitForAction);
            }
        }

        /**
         * 요소 하이라이트
         */
        _highlightElement(selector, position, arrowDirection) {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn('Tutorial: element not found:', selector);
                return;
            }

            const rect = element.getBoundingClientRect();

            // 스포트라이트 위치 및 크기 설정
            const spotlight = this.elements.spotlight;
            spotlight.style.left = (rect.left - 10) + 'px';
            spotlight.style.top = (rect.top - 10) + 'px';
            spotlight.style.width = (rect.width + 20) + 'px';
            spotlight.style.height = (rect.height + 20) + 'px';
            spotlight.style.display = 'block';

            // 오버레이 표시
            this.elements.overlay.style.display = 'block';

            // 말풍선 위치 설정
            this._positionBubble(rect, position);

            // 화살표 위치 설정
            if (arrowDirection) {
                this._positionArrow(rect, arrowDirection);
                this.elements.arrow.style.display = 'block';
            } else {
                this.elements.arrow.style.display = 'none';
            }

            // 하이라이트된 요소를 맨 위로
            element.style.position = 'relative';
            element.style.zIndex = '10001';
        }

        /**
         * 하이라이트 제거
         */
        _clearHighlight() {
            this.elements.overlay.style.display = 'none';
            this.elements.spotlight.style.display = 'none';
            this.elements.arrow.style.display = 'none';

            // 중앙 배치
            const bubble = this.elements.bubble;
            bubble.style.position = 'fixed';
            bubble.style.top = '50%';
            bubble.style.left = '50%';
            bubble.style.transform = 'translate(-50%, -50%)';
        }

        /**
         * 말풍선 위치 설정
         */
        _positionBubble(targetRect, position) {
            const bubble = this.elements.bubble;
            bubble.style.position = 'fixed';

            const bubbleRect = bubble.getBoundingClientRect();
            const margin = 20;

            switch (position) {
                case 'above':
                    bubble.style.left = (targetRect.left + targetRect.width / 2) + 'px';
                    bubble.style.top = (targetRect.top - bubbleRect.height - margin) + 'px';
                    bubble.style.transform = 'translateX(-50%)';
                    break;
                case 'below':
                    bubble.style.left = (targetRect.left + targetRect.width / 2) + 'px';
                    bubble.style.top = (targetRect.bottom + margin) + 'px';
                    bubble.style.transform = 'translateX(-50%)';
                    break;
                case 'left':
                    bubble.style.left = (targetRect.left - bubbleRect.width - margin) + 'px';
                    bubble.style.top = (targetRect.top + targetRect.height / 2) + 'px';
                    bubble.style.transform = 'translateY(-50%)';
                    break;
                case 'right':
                    bubble.style.left = (targetRect.right + margin) + 'px';
                    bubble.style.top = (targetRect.top + targetRect.height / 2) + 'px';
                    bubble.style.transform = 'translateY(-50%)';
                    break;
                default: // center
                    bubble.style.left = '50%';
                    bubble.style.top = '50%';
                    bubble.style.transform = 'translate(-50%, -50%)';
            }
        }

        /**
         * 화살표 위치 설정
         */
        _positionArrow(targetRect, direction) {
            const arrow = this.elements.arrow;
            const offset = 30;

            switch (direction) {
                case 'top':
                    arrow.className = 'tutorial-arrow arrow-down';
                    arrow.style.left = (targetRect.left + targetRect.width / 2) + 'px';
                    arrow.style.top = (targetRect.top - offset) + 'px';
                    arrow.style.transform = 'translateX(-50%)';
                    break;
                case 'bottom':
                    arrow.className = 'tutorial-arrow arrow-up';
                    arrow.style.left = (targetRect.left + targetRect.width / 2) + 'px';
                    arrow.style.top = (targetRect.bottom + offset) + 'px';
                    arrow.style.transform = 'translateX(-50%)';
                    break;
                case 'left':
                    arrow.className = 'tutorial-arrow arrow-right';
                    arrow.style.left = (targetRect.left - offset) + 'px';
                    arrow.style.top = (targetRect.top + targetRect.height / 2) + 'px';
                    arrow.style.transform = 'translateY(-50%)';
                    break;
                case 'right':
                    arrow.className = 'tutorial-arrow arrow-left';
                    arrow.style.left = (targetRect.right + offset) + 'px';
                    arrow.style.top = (targetRect.top + targetRect.height / 2) + 'px';
                    arrow.style.transform = 'translateY(-50%)';
                    break;
            }
        }

        /**
         * 진행 표시 점 업데이트
         */
        _updateDots() {
            const dotsContainer = this.elements.bubble.querySelector('.tutorial-dots');
            dotsContainer.innerHTML = '';

            this.steps.forEach((step, index) => {
                const dot = document.createElement('span');
                dot.className = 'tutorial-dot' + (index === this.currentStep ? ' active' : '');
                dotsContainer.appendChild(dot);
            });
        }

        /**
         * 특정 액션 대기
         */
        _waitForAction(action) {
            const handleAction = () => {
                this._removeActionListeners();
                this._nextStep();
            };

            // 기존 리스너 제거
            this._removeActionListeners();

            switch (action) {
                case 'takeoff':
                    this._actionListener = (e) => {
                        if (e.detail && e.detail.action === 'takeoff') {
                            handleAction();
                        }
                    };
                    window.addEventListener('tutorial:action', this._actionListener);
                    break;

                case 'direction':
                    this._actionListener = (e) => {
                        if (e.detail && ['forward', 'backward', 'left', 'right'].includes(e.detail.action)) {
                            handleAction();
                        }
                    };
                    window.addEventListener('tutorial:action', this._actionListener);
                    break;

                case 'altitude':
                    this._actionListener = (e) => {
                        if (e.detail && ['up', 'down'].includes(e.detail.action)) {
                            handleAction();
                        }
                    };
                    window.addEventListener('tutorial:action', this._actionListener);
                    break;

                case 'land':
                    this._actionListener = (e) => {
                        if (e.detail && e.detail.action === 'land') {
                            handleAction();
                        }
                    };
                    window.addEventListener('tutorial:action', this._actionListener);
                    break;

                case 'keyboard_T':
                    this._keyboardListener = (e) => {
                        if (e.key === 't' || e.key === 'T') handleAction();
                    };
                    document.addEventListener('keydown', this._keyboardListener);
                    break;

                case 'keyboard_WASD':
                    this._keyboardListener = (e) => {
                        if (['w','a','s','d','W','A','S','D'].includes(e.key)) handleAction();
                    };
                    document.addEventListener('keydown', this._keyboardListener);
                    break;

                case 'keyboard_altitude':
                    this._keyboardListener = (e) => {
                        if (e.key === ' ' || e.key === 'Shift') handleAction();
                    };
                    document.addEventListener('keydown', this._keyboardListener);
                    break;

                case 'keyboard_L':
                    this._keyboardListener = (e) => {
                        if (e.key === 'l' || e.key === 'L') handleAction();
                    };
                    document.addEventListener('keydown', this._keyboardListener);
                    break;
            }
        }

        /**
         * 액션 리스너 제거
         */
        _removeActionListeners() {
            if (this._actionListener) {
                window.removeEventListener('tutorial:action', this._actionListener);
                this._actionListener = null;
            }
            if (this._keyboardListener) {
                document.removeEventListener('keydown', this._keyboardListener);
                this._keyboardListener = null;
            }
        }

        /**
         * 다음 버튼 클릭 처리
         */
        _handleNext() {
            this._nextStep();
        }

        /**
         * 다음 단계로 이동
         */
        _nextStep() {
            this._showStep(this.currentStep + 1);
        }

        /**
         * 건너뛰기
         */
        _skip() {
            this._complete();
        }

        /**
         * 튜토리얼 완료
         */
        _complete() {
            this.isActive = false;
            this.markCompleted();
            this._cleanup();

            if (this.onComplete) {
                this.onComplete();
            }
        }

        /**
         * UI 정리
         */
        _cleanup() {
            this._removeActionListeners();

            if (this.elements.overlay) this.elements.overlay.remove();
            if (this.elements.spotlight) this.elements.spotlight.remove();
            if (this.elements.bubble) this.elements.bubble.remove();
            if (this.elements.arrow) this.elements.arrow.remove();
            if (this.elements.skipBtn) this.elements.skipBtn.remove();

            // 하이라이트된 요소 z-index 복원
            const highlighted = document.querySelectorAll('[style*="z-index: 10001"]');
            highlighted.forEach(el => {
                el.style.zIndex = '';
            });
        }

        /**
         * 튜토리얼 재설정 (테스트용)
         */
        reset() {
            try {
                localStorage.removeItem(this.storageKey);
            } catch (e) {
                console.warn('Could not reset tutorial state');
            }
        }
    }

    // 전역 네임스페이스에 등록
    window.DroneSim = window.DroneSim || {};
    window.DroneSim.OnboardingTutorial = OnboardingTutorial;
})();
