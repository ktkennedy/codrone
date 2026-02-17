/**
 * UI 컴포넌트
 * HUD (계기판), 메시지 표시, 미니맵 등 공통 UI를 제공합니다.
 */

// ===== HUD (헤드업 디스플레이) =====
class HUD {
    constructor(container) {
        this.container = container || document.body;
        this.element = null;
        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.id = 'drone-hud';
        this.element.innerHTML = `
            <div class="hud-compact">
                <div class="hud-row">
                    <span class="hud-tag" id="hud-status">착륙</span>
                    <span class="hud-data"><span id="hud-altitude">0.0</span>m</span>
                    <span class="hud-data"><span id="hud-speed">0.0</span>m/s</span>
                </div>
                <div class="hud-row">
                    <span class="hud-data small"><span id="hud-heading">N</span> <span id="hud-heading-deg">0</span>&deg;</span>
                    <span class="hud-data small">V:<span id="hud-vspeed">0.0</span></span>
                    <div class="hud-battery-bar"><div class="hud-battery-fill" id="hud-battery-fill"></div></div>
                    <span class="hud-data small"><span id="hud-battery">100</span>%</span>
                </div>
            </div>
            <div class="hud-cam" id="hud-camera-mode">3인칭</div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #drone-hud {
                position: fixed;
                top: 8px; right: 8px;
                z-index: 30;
                pointer-events: none;
                font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
                opacity: 0.6;
            }
            .hud-compact {
                background: rgba(0, 0, 0, 0.35);
                border-radius: 6px;
                padding: 4px 8px;
                color: #fff;
                min-width: 150px;
            }
            .hud-row {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                line-height: 1.6;
            }
            .hud-tag {
                font-size: 10px;
                font-weight: bold;
                padding: 1px 6px;
                border-radius: 4px;
                background: rgba(255,255,255,0.15);
            }
            .hud-tag.flying { background: rgba(68,255,136,0.3); color: #44ff88; }
            .hud-tag.landing { background: rgba(255,170,68,0.3); color: #ffaa44; }
            .hud-tag.grounded { background: rgba(255,255,255,0.1); color: #aaa; }
            .hud-tag.warning { background: rgba(255,68,68,0.3); color: #ff4444; }
            .hud-data {
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 13px;
                color: #ddeeff;
            }
            .hud-data.small {
                font-size: 10px;
                font-weight: normal;
                color: #99bbdd;
            }
            .hud-battery-bar {
                width: 40px; height: 6px;
                background: rgba(255,255,255,0.15);
                border-radius: 3px; overflow: hidden;
            }
            .hud-battery-fill {
                height: 100%; width: 100%;
                background: #44ff88; border-radius: 3px;
                transition: width 0.3s, background 0.3s;
            }
            .hud-battery-fill.low { background: #ff4444; }
            .hud-battery-fill.medium { background: #ffaa44; }
            .hud-cam {
                text-align: right;
                font-size: 9px;
                color: #6688aa;
                margin-top: 2px;
                padding-right: 2px;
            }
        `;
        document.head.appendChild(style);
        this.container.appendChild(this.element);
    }

    update(state) {
        var $ = function(id) { return document.getElementById(id); };

        var altEl = $('hud-altitude');
        if (altEl) altEl.textContent = state.altitude.toFixed(1);
        var spdEl = $('hud-speed');
        if (spdEl) spdEl.textContent = state.speed.toFixed(1);
        var vsEl = $('hud-vspeed');
        if (vsEl) vsEl.textContent = (state.verticalSpeed >= 0 ? '+' : '') + state.verticalSpeed.toFixed(1);

        // 방향
        var headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        var headingIdx = Math.round(state.heading / 45) % 8;
        var hdEl = $('hud-heading');
        if (hdEl) hdEl.textContent = headings[headingIdx];
        var hdDeg = $('hud-heading-deg');
        if (hdDeg) hdDeg.textContent = Math.round(state.heading);

        // 배터리
        var battery = Math.round(state.battery);
        var batEl = $('hud-battery');
        if (batEl) batEl.textContent = battery;
        var batteryFill = $('hud-battery-fill');
        if (batteryFill) {
            batteryFill.style.width = battery + '%';
            batteryFill.className = 'hud-battery-fill' +
                (battery < 20 ? ' low' : battery < 50 ? ' medium' : '');
        }

        // 상태
        var statusEl = $('hud-status');
        if (statusEl) {
            if (!state.isFlying && !state.isLanding) {
                statusEl.textContent = '착륙';
                statusEl.className = 'hud-tag grounded';
            } else if (state.isLanding) {
                statusEl.textContent = '착륙중';
                statusEl.className = 'hud-tag landing';
            } else {
                statusEl.textContent = '비행';
                statusEl.className = 'hud-tag flying';
            }
        }
    }

    setCameraMode(modeName) {
        var el = document.getElementById('hud-camera-mode');
        if (el) el.textContent = modeName;
    }

    showWarning(text) {
        var statusEl = document.getElementById('hud-status');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.className = 'hud-tag warning';
        }
    }
}

// ===== 메시지 표시 =====
class MessageDisplay {
    constructor(container) {
        this.container = container || document.body;
        this.element = document.createElement('div');
        this.element.id = 'message-display';

        var style = document.createElement('style');
        style.textContent = `
            #message-display {
                position: fixed;
                top: 50%; left: 50%; transform: translate(-50%, -50%);
                pointer-events: none; z-index: 200;
                text-align: center;
            }
            .msg-popup {
                padding: 15px 30px;
                border-radius: 12px;
                font-size: 24px; font-weight: bold;
                font-family: 'Noto Sans KR', sans-serif;
                animation: msgFadeIn 0.3s ease-out;
                margin: 10px 0;
            }
            .msg-popup.info { background: rgba(68, 136, 255, 0.8); color: #fff; }
            .msg-popup.success { background: rgba(68, 255, 136, 0.8); color: #000; }
            .msg-popup.warning { background: rgba(255, 170, 68, 0.8); color: #000; }
            .msg-popup.error { background: rgba(255, 68, 68, 0.8); color: #fff; }
            @keyframes msgFadeIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes msgFadeOut {
                from { opacity: 1; }
                to { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        this.container.appendChild(this.element);
    }

    show(text, type, duration) {
        type = type || 'info';
        duration = duration || 2000;
        var msg = document.createElement('div');
        msg.className = 'msg-popup ' + type;
        msg.textContent = text;
        this.element.appendChild(msg);

        setTimeout(function () {
            msg.style.animation = 'msgFadeOut 0.5s ease-in forwards';
            setTimeout(function () { msg.remove(); }, 500);
        }, duration);
    }
}

// ===== 미니맵 =====
class Minimap {
    constructor(container, size) {
        this.size = size || 100;
        this.range = 60;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.id = 'minimap';
        this._hidden = false;

        var style = document.createElement('style');
        style.textContent = `
            #minimap {
                position: fixed;
                bottom: 15px; left: 10px;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                background: rgba(0,0,0,0.3);
                z-index: 30;
                opacity: 0.35;
                transition: opacity 0.3s, transform 0.3s;
                cursor: pointer;
                transform-origin: bottom left;
            }
            #minimap:hover {
                opacity: 0.8;
                transform: scale(1.3);
            }
            #minimap.hidden {
                opacity: 0;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        (container || document.body).appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // 클릭으로 토글
        var self = this;
        this.canvas.addEventListener('click', function () { self.toggle(); });

        // N키로 토글
        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyN' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                self.toggle();
            }
        });
    }

    toggle() {
        this._hidden = !this._hidden;
        if (this._hidden) {
            this.canvas.classList.add('hidden');
        } else {
            this.canvas.classList.remove('hidden');
        }
    }

    /**
     * 웨이포인트 경로 설정
     * @param {Array} waypoints - [{x, y, z}, ...] 배열
     */
    setWaypoints(waypoints) {
        this._waypoints = waypoints || [];
    }

    /**
     * 현재 목표 웨이포인트 인덱스 설정
     */
    setCurrentWaypointIndex(index) {
        this._currentWpIndex = index;
    }

    /**
     * 웨이포인트 경로 초기화
     */
    clearWaypoints() {
        this._waypoints = [];
        this._currentWpIndex = 0;
    }

    update(droneState, objects) {
        objects = objects || [];
        var ctx = this.ctx;
        var s = this.size;
        var r = this.range;

        ctx.clearRect(0, 0, s, s);
        ctx.fillStyle = 'rgba(40, 60, 40, 0.8)';
        ctx.fillRect(0, 0, s, s);

        // 격자
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        for (var i = 0; i <= 4; i++) {
            var p = (i / 4) * s;
            ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
        }

        var toScreen = function (worldX, worldZ) {
            return {
                x: (worldX / r + 0.5) * s,
                y: (worldZ / r + 0.5) * s
            };
        };

        // 착륙 패드
        var padPos = toScreen(0, 0);
        ctx.fillStyle = 'rgba(255, 102, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(padPos.x, padPos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 드론 위치
        var dp = toScreen(droneState.position.x, droneState.position.z);
        ctx.save();
        ctx.translate(dp.x, dp.y);
        ctx.rotate(droneState.rotation.yaw);
        ctx.fillStyle = '#44ff88';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-2, 3);
        ctx.lineTo(2, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 웨이포인트 경로 렌더링
        if (this._waypoints && this._waypoints.length > 0) {
            var wps = this._waypoints;
            var curIdx = this._currentWpIndex || 0;

            // 웨이포인트 사이 경로선
            ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 2]);
            ctx.beginPath();
            for (var wi = 0; wi < wps.length; wi++) {
                var wp = toScreen(wps[wi].x, wps[wi].z);
                if (wi === 0) ctx.moveTo(wp.x, wp.y);
                else ctx.lineTo(wp.x, wp.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // 각 웨이포인트 마커
            for (var wi = 0; wi < wps.length; wi++) {
                var wp = toScreen(wps[wi].x, wps[wi].z);
                var isCurrent = (wi === curIdx);

                // 원
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, isCurrent ? 4 : 3, 0, Math.PI * 2);
                if (wi < curIdx) {
                    // 완료된 웨이포인트
                    ctx.fillStyle = 'rgba(68, 255, 136, 0.7)';
                } else if (isCurrent) {
                    // 현재 목표
                    ctx.fillStyle = 'rgba(255, 220, 68, 0.9)';
                } else {
                    // 미래 웨이포인트
                    ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
                }
                ctx.fill();

                // 번호
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 6px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('' + (wi + 1), wp.x, wp.y);

                // 좌표 표시 (현재 목표만)
                if (isCurrent) {
                    ctx.fillStyle = 'rgba(255, 220, 68, 0.8)';
                    ctx.font = '5px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    ctx.fillText(Math.round(wps[wi].x) + ',' + Math.round(wps[wi].z), wp.x + 5, wp.y - 2);
                }
            }
            ctx.textBaseline = 'alphabetic';
        }

        // 방위
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', s / 2, 10);
    }
}

// ===== 경로 좌표 오버레이 =====
class PathOverlay {
    constructor(container) {
        this.container = container || document.body;
        this._waypoints = [];
        this._segmentTimes = [];
        this._totalTime = 0;
        this._currentIndex = 0;
        this._distanceToNext = 0;
        this._estimatedTime = 0;
        this._dronePos = { x: 0, y: 0, z: 0 };
        this._visible = false;
        this._completedIndices = {};

        this._create();
    }

    _create() {
        this.element = document.createElement('div');
        this.element.id = 'path-overlay';

        var style = document.createElement('style');
        style.textContent = `
            #path-overlay {
                position: fixed;
                top: 80px; left: 10px;
                z-index: 40;
                background: rgba(0, 0, 0, 0.65);
                border: 1px solid rgba(74, 158, 255, 0.3);
                border-radius: 8px;
                padding: 10px 12px;
                color: #ddeeff;
                font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
                font-size: 11px;
                min-width: 260px;
                max-height: 50vh;
                overflow-y: auto;
                pointer-events: auto;
                opacity: 0;
                transform: translateX(-10px);
                transition: opacity 0.3s, transform 0.3s;
                display: none;
            }
            #path-overlay.visible {
                display: block;
                opacity: 1;
                transform: translateX(0);
            }
            #path-overlay .po-title {
                font-size: 12px;
                font-weight: bold;
                color: #4a9eff;
                margin-bottom: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #path-overlay .po-drone-pos {
                font-size: 10px;
                color: #88bbdd;
                margin-bottom: 6px;
                font-family: 'Courier New', monospace;
            }
            #path-overlay table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                font-family: 'Courier New', monospace;
            }
            #path-overlay th {
                text-align: center;
                color: #6699bb;
                border-bottom: 1px solid rgba(74, 158, 255, 0.2);
                padding: 2px 4px;
                font-weight: normal;
            }
            #path-overlay td {
                text-align: center;
                padding: 2px 4px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            #path-overlay tr.wp-done td {
                color: #66aa77;
            }
            #path-overlay tr.wp-current td {
                color: #ffdd44;
                font-weight: bold;
            }
            #path-overlay tr.wp-future td {
                color: #8899aa;
            }
            #path-overlay .po-summary {
                margin-top: 6px;
                font-size: 10px;
                color: #88bbdd;
                text-align: right;
            }
            #path-overlay .po-check {
                color: #44ff88;
            }
            #path-overlay .po-arrow {
                color: #ffdd44;
            }
            #path-overlay .po-hint {
                font-size: 9px;
                color: #556677;
                text-align: center;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
        this.container.appendChild(this.element);
    }

    /**
     * 경로 설정 및 표시
     * @param {Array} waypoints - [{x, y, z}, ...]
     * @param {Array} segmentTimes - 각 세그먼트 예상 시간 [sec, ...]
     * @param {number} totalTime - 총 예상 시간
     */
    setPath(waypoints, segmentTimes, totalTime) {
        this._waypoints = waypoints || [];
        this._segmentTimes = segmentTimes || [];
        this._totalTime = totalTime || 0;
        this._currentIndex = 0;
        this._completedIndices = {};
        this._render();
    }

    /**
     * 현재 진행 상황 업데이트
     */
    updateProgress(currentWaypointIndex, distanceToNext, estimatedTime, dronePos) {
        // 이전 인덱스들 완료 처리
        for (var i = 0; i < currentWaypointIndex; i++) {
            this._completedIndices[i] = true;
        }
        this._currentIndex = currentWaypointIndex;
        this._distanceToNext = distanceToNext || 0;
        this._estimatedTime = estimatedTime || 0;
        if (dronePos) {
            this._dronePos = dronePos;
        }
        this._render();
    }

    /**
     * 경로 정보 테이블 렌더링
     */
    _render() {
        if (!this._waypoints || this._waypoints.length === 0) {
            this.element.innerHTML = '<div class="po-title">경로 정보</div><div style="color:#556677;font-size:10px;">경로가 설정되지 않았습니다.</div><div class="po-hint">[P] 토글</div>';
            return;
        }

        var html = '<div class="po-title"><span>경로 정보</span><span style="font-size:9px;color:#6699bb;">' + this._waypoints.length + '개 지점</span></div>';

        // 드론 현재 위치
        html += '<div class="po-drone-pos">드론: (' +
            this._dronePos.x.toFixed(1) + ', ' +
            this._dronePos.y.toFixed(1) + ', ' +
            this._dronePos.z.toFixed(1) + ')</div>';

        // 테이블
        html += '<table><tr><th></th><th>#</th><th>X</th><th>Y</th><th>Z</th><th>거리</th><th>시간</th></tr>';

        var prevWp = null;
        for (var i = 0; i < this._waypoints.length; i++) {
            var wp = this._waypoints[i];
            var isDone = !!this._completedIndices[i];
            var isCurrent = (i === this._currentIndex);
            var rowClass = isDone ? 'wp-done' : (isCurrent ? 'wp-current' : 'wp-future');

            // 거리 계산 (이전 웨이포인트로부터)
            var dist = '';
            if (i > 0 && prevWp) {
                var dx = wp.x - prevWp.x;
                var dy = wp.y - prevWp.y;
                var dz = wp.z - prevWp.z;
                dist = Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(1) + 'm';
            }

            // 세그먼트 시간
            var segTime = '';
            if (i > 0 && this._segmentTimes[i - 1] !== undefined) {
                segTime = this._segmentTimes[i - 1].toFixed(1) + 's';
            }

            // 상태 아이콘
            var icon = '';
            if (isDone) icon = '<span class="po-check">V</span>';
            else if (isCurrent) icon = '<span class="po-arrow">></span>';

            html += '<tr class="' + rowClass + '">';
            html += '<td>' + icon + '</td>';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td>' + Math.round(wp.x) + '</td>';
            html += '<td>' + Math.round(wp.y) + '</td>';
            html += '<td>' + Math.round(wp.z) + '</td>';
            html += '<td>' + dist + '</td>';
            html += '<td>' + segTime + '</td>';
            html += '</tr>';

            prevWp = wp;
        }
        html += '</table>';

        // 요약
        html += '<div class="po-summary">';
        if (this._distanceToNext > 0) {
            html += '다음까지: ' + this._distanceToNext.toFixed(1) + 'm | ';
        }
        html += '총 예상: ' + this._totalTime.toFixed(1) + 's';
        html += '</div>';
        html += '<div class="po-hint">[P] 토글</div>';

        this.element.innerHTML = html;
    }

    /**
     * 토글 표시/숨기기
     */
    toggle() {
        this._visible = !this._visible;
        if (this._visible) {
            this.element.classList.add('visible');
        } else {
            this.element.classList.remove('visible');
        }
    }

    /**
     * 표시
     */
    show() {
        this._visible = true;
        this.element.classList.add('visible');
    }

    /**
     * 숨기기
     */
    hide() {
        this._visible = false;
        this.element.classList.remove('visible');
    }

    /**
     * 경로 초기화
     */
    clear() {
        this._waypoints = [];
        this._segmentTimes = [];
        this._totalTime = 0;
        this._currentIndex = 0;
        this._completedIndices = {};
        this._render();
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.HUD = HUD;
window.DroneSim.MessageDisplay = MessageDisplay;
window.DroneSim.Minimap = Minimap;
window.DroneSim.PathOverlay = PathOverlay;
