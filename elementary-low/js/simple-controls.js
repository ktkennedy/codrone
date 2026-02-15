/**
 * 저학년 조작 시스템
 * 큰 화면 버튼 + 터치 지원 + 자동 안정화
 */
class SimpleControls {
    constructor(physics) {
        this.physics = physics;
        this.input = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
        this.activeButtons = new Set();
        this._createUI();
        this._bindEvents();
    }

    _createUI() {
        const panel = document.createElement('div');
        panel.id = 'controls-panel';
        panel.innerHTML = `
            <!-- 왼쪽: 상승/하강 -->
            <div class="control-group">
                <div class="vertical-controls">
                    <button class="vert-btn" data-action="up">&#x2B06; 위로</button>
                    <button class="vert-btn" data-action="down">&#x2B07; 아래로</button>
                </div>
            </div>

            <!-- 중앙: 이착륙 -->
            <div class="control-group">
                <div class="action-controls">
                    <button class="action-btn takeoff" id="btn-takeoff">
                        <span class="icon">&#x1F680;</span>
                        이륙
                    </button>
                    <button class="action-btn land" id="btn-land">
                        <span class="icon">&#x1F6EC;</span>
                        착륙
                    </button>
                </div>
            </div>

            <!-- 오른쪽: 방향 D-pad -->
            <div class="control-group">
                <div class="dpad">
                    <div class="dpad-btn empty"></div>
                    <button class="dpad-btn" data-action="forward">&#x2B06;</button>
                    <div class="dpad-btn empty"></div>
                    <button class="dpad-btn" data-action="left">&#x2B05;</button>
                    <div class="dpad-btn empty"></div>
                    <button class="dpad-btn" data-action="right">&#x27A1;</button>
                    <div class="dpad-btn empty"></div>
                    <button class="dpad-btn" data-action="backward">&#x2B07;</button>
                    <div class="dpad-btn empty"></div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    _bindEvents() {
        // 터치 & 마우스 이벤트
        const buttons = document.querySelectorAll('[data-action]');
        buttons.forEach(btn => {
            const action = btn.dataset.action;

            // 터치 시작
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this._pressButton(action, btn);
            });
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this._pressButton(action, btn);
            });

            // 터치 끝
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._releaseButton(action, btn);
            });
            btn.addEventListener('mouseup', (e) => {
                this._releaseButton(action, btn);
            });
            btn.addEventListener('mouseleave', (e) => {
                this._releaseButton(action, btn);
            });
        });

        // 이착륙 버튼
        document.getElementById('btn-takeoff').addEventListener('click', () => {
            this.physics.takeoff(2);
        });
        document.getElementById('btn-land').addEventListener('click', () => {
            this.physics.land();
        });

        // 키보드도 지원 (저학년이지만 키보드가 있는 경우)
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            switch (e.key) {
                case 'ArrowUp': this._pressButton('forward'); break;
                case 'ArrowDown': this._pressButton('backward'); break;
                case 'ArrowLeft': this._pressButton('left'); break;
                case 'ArrowRight': this._pressButton('right'); break;
                case ' ': e.preventDefault(); this._pressButton('up'); break;
                case 'Shift': this._pressButton('down'); break;
                case 't': case 'T': this.physics.takeoff(2); break;
                case 'l': case 'L': this.physics.land(); break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch (e.key) {
                case 'ArrowUp': this._releaseButton('forward'); break;
                case 'ArrowDown': this._releaseButton('backward'); break;
                case 'ArrowLeft': this._releaseButton('left'); break;
                case 'ArrowRight': this._releaseButton('right'); break;
                case ' ': this._releaseButton('up'); break;
                case 'Shift': this._releaseButton('down'); break;
            }
        });
    }

    _pressButton(action, btnElement) {
        this.activeButtons.add(action);
        if (btnElement) btnElement.classList.add('pressed');
    }

    _releaseButton(action, btnElement) {
        this.activeButtons.delete(action);
        if (btnElement) btnElement.classList.remove('pressed');
        // 버튼에서 pressed 클래스 제거 (btnElement 없는 키보드 경우)
        if (!btnElement) {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) btn.classList.remove('pressed');
        }
    }

    /**
     * 매 프레임 호출 - 현재 입력 상태 반환
     */
    getInput() {
        const strength = 0.5; // 저학년은 약한 입력 (속도 제한)

        this.input.throttle = 0;
        this.input.pitch = 0;
        this.input.roll = 0;
        this.input.yaw = 0;

        if (this.activeButtons.has('up')) this.input.throttle = strength;
        if (this.activeButtons.has('down')) this.input.throttle = -strength;
        if (this.activeButtons.has('forward')) this.input.pitch = strength;
        if (this.activeButtons.has('backward')) this.input.pitch = -strength;
        if (this.activeButtons.has('left')) this.input.roll = strength;
        if (this.activeButtons.has('right')) this.input.roll = -strength;

        return this.input;
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.SimpleControls = SimpleControls;
