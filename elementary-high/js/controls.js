/**
 * 고학년 키보드 조작 시스템
 * WASD + 화살표 + Space/Shift 전체 키보드 조작
 */
class KeyboardControls {
    constructor(physics) {
        this.physics = physics;
        this.keys = {};
        this.input = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
        this._createUI();
        this._bindEvents();
    }

    _createUI() {
        // 키 안내 패널
        const guide = document.createElement('div');
        guide.id = 'key-guide';
        guide.className = 'hidden';
        guide.innerHTML = `
            <h4>조작 키 (H로 숨기기)</h4>
            <div class="key-row"><span class="key">W</span><span class="key">S</span> <span class="key-desc">전진 / 후진</span></div>
            <div class="key-row"><span class="key">A</span><span class="key">D</span> <span class="key-desc">좌 / 우 이동</span></div>
            <div class="key-row"><span class="key">Space</span> <span class="key-desc">상승</span></div>
            <div class="key-row"><span class="key">Shift</span> <span class="key-desc">하강</span></div>
            <div class="key-row"><span class="key">Q</span><span class="key">E</span> <span class="key-desc">좌 / 우 회전</span></div>
            <div class="key-row"><span class="key">T</span> <span class="key-desc">이륙</span></div>
            <div class="key-row"><span class="key">L</span> <span class="key-desc">착륙</span></div>
            <div class="key-row"><span class="key">C</span> <span class="key-desc">카메라 전환</span></div>
            <div class="key-row"><span class="key">G</span> <span class="key-desc">안정화 토글</span></div>
            <div class="key-row"><span class="key">H</span> <span class="key-desc">안내 숨기기</span></div>
        `;
        document.body.appendChild(guide);

        // 자동안정화 토글
        const toggle = document.createElement('div');
        toggle.id = 'stabilize-toggle';
        toggle.innerHTML = `<button class="toggle-btn active" id="btn-stabilize">자동 안정화 ON</button>`;
        document.body.appendChild(toggle);

        document.getElementById('btn-stabilize').addEventListener('click', () => {
            this.toggleStabilize();
        });
    }

    _bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;

            switch (e.key.toLowerCase()) {
                case 't': this.physics.takeoff(3); break;
                case 'l': this.physics.land(); break;
                case 'g': this.toggleStabilize(); break;
                case 'h': this._toggleGuide(); break;
                case ' ': e.preventDefault(); break;
            }

            // 'c' 키는 카메라 전환 (앱에서 처리)
            if (e.key.toLowerCase() === 'c' && this.onCameraSwitch) {
                this.onCameraSwitch();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        });

        // 윈도우 포커스 잃으면 모든 키 리셋
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    toggleStabilize() {
        this.physics.autoStabilize = !this.physics.autoStabilize;
        const btn = document.getElementById('btn-stabilize');
        if (btn) {
            btn.textContent = '자동 안정화 ' + (this.physics.autoStabilize ? 'ON' : 'OFF');
            btn.classList.toggle('active', this.physics.autoStabilize);
        }
    }

    _toggleGuide() {
        const guide = document.getElementById('key-guide');
        if (guide) guide.classList.toggle('hidden');
    }

    /**
     * 매 프레임 호출 - 현재 입력 상태 반환
     */
    getInput() {
        const strength = 0.8;

        this.input.throttle = 0;
        this.input.pitch = 0;
        this.input.roll = 0;
        this.input.yaw = 0;

        // 스로틀 (수직)
        if (this.keys[' '] || this.keys['Space']) this.input.throttle = strength;
        if (this.keys['shift'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']) this.input.throttle = -strength * 0.7;

        // 전후 (피치) - 양수 피치 = 기수 하향 = 전진
        if (this.keys['w'] || this.keys['arrowup']) this.input.pitch = strength;
        if (this.keys['s'] || this.keys['arrowdown']) this.input.pitch = -strength;

        // 좌우 (롤) - 양수 롤 = 좌측 기울기 = 좌이동
        if (this.keys['a'] || this.keys['arrowleft']) this.input.roll = strength;
        if (this.keys['d'] || this.keys['arrowright']) this.input.roll = -strength;

        // 회전 (요)
        if (this.keys['q']) this.input.yaw = -strength;
        if (this.keys['e']) this.input.yaw = strength;

        return this.input;
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.KeyboardControls = KeyboardControls;
