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

        var style = document.createElement('style');
        style.textContent = `
            #minimap {
                position: fixed;
                top: 50px; right: 8px;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                background: rgba(0,0,0,0.3);
                z-index: 30;
                opacity: 0.5;
            }
        `;
        document.head.appendChild(style);
        (container || document.body).appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
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

        // 방위
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', s / 2, 10);
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.HUD = HUD;
window.DroneSim.MessageDisplay = MessageDisplay;
window.DroneSim.Minimap = Minimap;
