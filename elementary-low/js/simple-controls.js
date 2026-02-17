/**
 * 저학년 조작 시스템
 * 큰 화면 버튼 + 터치 지원 + 자동 안정화
 */
class SimpleControls {
    constructor(physics) {
        this.physics = physics;
        this.input = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
        this._smoothInput = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
        this.activeButtons = new Set();
        this._createUI();
        this._bindEvents();
    }

    _createUI() {
        const panel = document.createElement('div');
        panel.id = 'controls-panel';
        panel.innerHTML = `
            <!-- 왼쪽: 상승/하강 + 좌회전/우회전 -->
            <div class="control-group">
                <div class="vertical-controls">
                    <button class="vert-btn" data-action="up">&#x2B06; 위로</button>
                    <button class="vert-btn" data-action="down">&#x2B07; 아래로</button>
                </div>
                <div class="turn-controls">
                    <button class="turn-btn" data-action="turnLeft">&#x21A9; 왼쪽</button>
                    <button class="turn-btn" data-action="turnRight">&#x21AA; 오른쪽</button>
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
                case 'q': case 'Q': this._pressButton('turnLeft'); break;
                case 'e': case 'E': this._pressButton('turnRight'); break;
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
                case 'q': case 'Q': this._releaseButton('turnLeft'); break;
                case 'e': case 'E': this._releaseButton('turnRight'); break;
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
     * 속도/자세 기반 댐핑 + 부드러운 보간으로 뱅글뱅글 방지
     */
    getInput() {
        const strength = 0.5; // 저학년은 약한 입력 (속도 제한)
        const smoothing = 0.15; // 저학년은 느린 반응이 안전

        // 물리 상태 참조
        const vel = this.physics.velocity || { x: 0, y: 0, z: 0 };
        const rot = this.physics.rotation || { pitch: 0, roll: 0, yaw: 0 };

        // 수평 속도 기반 댐핑: 빠를수록 추가 입력을 줄여 과속 방지
        const hSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        const maxSpeed = 4;
        const speedDamping = Math.max(0.2, 1 - hSpeed / maxSpeed);

        // 기울기 기반 댐핑: 이미 기울어져 있으면 추가 roll/pitch 입력 줄이기
        const tiltAmount = Math.sqrt(rot.pitch * rot.pitch + rot.roll * rot.roll);
        const tiltDamping = Math.max(0.3, 1 - tiltAmount / (Math.PI / 8));

        const horizDamping = speedDamping * tiltDamping;

        // 목표 raw 입력 계산
        let targetThrottle = 0;
        let targetPitch = 0;
        let targetRoll = 0;
        let targetYaw = 0;

        if (this.activeButtons.has('up'))        targetThrottle = strength;
        if (this.activeButtons.has('down'))       targetThrottle = -strength;
        if (this.activeButtons.has('forward'))    targetPitch = strength * horizDamping;
        if (this.activeButtons.has('backward'))   targetPitch = -strength * horizDamping;
        if (this.activeButtons.has('left'))       targetRoll = strength * horizDamping;
        if (this.activeButtons.has('right'))      targetRoll = -strength * horizDamping;
        if (this.activeButtons.has('turnLeft'))   targetYaw = strength;
        if (this.activeButtons.has('turnRight'))  targetYaw = -strength;

        // 입력이 없을 때 자동 감속: 현재 수평 속도에 반하는 미세 입력으로 빠른 정지 보조
        const noHorizInput = !this.activeButtons.has('forward') &&
                             !this.activeButtons.has('backward') &&
                             !this.activeButtons.has('left') &&
                             !this.activeButtons.has('right');
        if (noHorizInput && hSpeed > 0.2) {
            const brakeFactor = 0.08;
            // 수평 속도 방향 반대로 미세 pitch/roll 브레이크
            targetPitch = -Math.sign(vel.z) * brakeFactor;
            targetRoll  =  Math.sign(vel.x) * brakeFactor;
        }

        // 부드러운 보간 (smoothing)
        this._smoothInput.throttle = this._smoothInput.throttle * (1 - smoothing) + targetThrottle * smoothing;
        this._smoothInput.pitch    = this._smoothInput.pitch    * (1 - smoothing) + targetPitch    * smoothing;
        this._smoothInput.roll     = this._smoothInput.roll     * (1 - smoothing) + targetRoll     * smoothing;
        this._smoothInput.yaw      = this._smoothInput.yaw      * (1 - smoothing) + targetYaw      * smoothing;

        // 매우 작은 값은 0으로 정리 (부동소수점 잔류 방지)
        const deadzone = 0.001;
        this.input.throttle = Math.abs(this._smoothInput.throttle) > deadzone ? this._smoothInput.throttle : 0;
        this.input.pitch    = Math.abs(this._smoothInput.pitch)    > deadzone ? this._smoothInput.pitch    : 0;
        this.input.roll     = Math.abs(this._smoothInput.roll)     > deadzone ? this._smoothInput.roll     : 0;
        this.input.yaw      = Math.abs(this._smoothInput.yaw)      > deadzone ? this._smoothInput.yaw      : 0;

        return this.input;
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.SimpleControls = SimpleControls;
