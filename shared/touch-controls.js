/**
 * 모바일 터치 조작 시스템
 * 터치 디바이스에서 가상 조이스틱과 버튼으로 드론을 조종합니다.
 * 키보드가 없는 태블릿/스마트폰 환경에서 자동 활성화됩니다.
 */
(function() {
    'use strict';

    var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isTouchDevice) {
        window.DroneSim = window.DroneSim || {};
        window.DroneSim.TouchControls = null;
        return;
    }

    function TouchControls(physics) {
        this.physics = physics;
        this.input = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };

        // 조이스틱 상태
        this._leftStick = { active: false, touchId: null, cx: 0, cy: 0, dx: 0, dy: 0 };
        this._rightStick = { active: false, touchId: null, cx: 0, cy: 0, dx: 0, dy: 0 };

        this.onCameraSwitch = null;
        this.onTakeoff = null;

        this._create();
        this._bindTouch();
    }

    TouchControls.prototype._create = function() {
        // 컨테이너
        var container = document.createElement('div');
        container.id = 'touch-controls';
        container.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:60;pointer-events:none;';

        // 왼쪽 조이스틱 (이동: pitch/roll)
        var leftArea = document.createElement('div');
        leftArea.id = 'touch-left';
        leftArea.style.cssText = 'position:absolute;bottom:20px;left:20px;width:120px;height:120px;pointer-events:auto;';
        var leftBg = document.createElement('div');
        leftBg.style.cssText = 'width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);position:relative;';
        var leftKnob = document.createElement('div');
        leftKnob.id = 'touch-left-knob';
        leftKnob.style.cssText = 'width:40px;height:40px;border-radius:50%;background:rgba(74,158,255,0.5);border:2px solid rgba(74,158,255,0.7);position:absolute;top:40px;left:40px;transition:none;';
        leftBg.appendChild(leftKnob);
        leftArea.appendChild(leftBg);
        container.appendChild(leftArea);

        // 오른쪽 조이스틱 (throttle/yaw)
        var rightArea = document.createElement('div');
        rightArea.id = 'touch-right';
        rightArea.style.cssText = 'position:absolute;bottom:20px;right:20px;width:120px;height:120px;pointer-events:auto;';
        var rightBg = document.createElement('div');
        rightBg.style.cssText = 'width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);position:relative;';
        var rightKnob = document.createElement('div');
        rightKnob.id = 'touch-right-knob';
        rightKnob.style.cssText = 'width:40px;height:40px;border-radius:50%;background:rgba(68,255,136,0.5);border:2px solid rgba(68,255,136,0.7);position:absolute;top:40px;left:40px;transition:none;';
        rightBg.appendChild(rightKnob);
        rightArea.appendChild(rightBg);
        container.appendChild(rightArea);

        // 라벨
        var leftLabel = document.createElement('div');
        leftLabel.style.cssText = 'text-align:center;color:rgba(255,255,255,0.4);font-size:10px;margin-top:4px;';
        leftLabel.textContent = '이동';
        leftArea.appendChild(leftLabel);

        var rightLabel = document.createElement('div');
        rightLabel.style.cssText = 'text-align:center;color:rgba(255,255,255,0.4);font-size:10px;margin-top:4px;';
        rightLabel.textContent = '고도/회전';
        rightArea.appendChild(rightLabel);

        // 상단 버튼들
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'position:absolute;bottom:160px;left:50%;transform:translateX(-50%);display:flex;gap:10px;pointer-events:auto;';

        var btnTakeoff = this._makeButton('T 이륙', '#2d8f4e');
        btnTakeoff.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.physics.takeoff(3);
            if (this.onTakeoff) this.onTakeoff();
        }.bind(this));
        btnRow.appendChild(btnTakeoff);

        var btnLand = this._makeButton('L 착륙', '#cc8844');
        btnLand.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.physics.land();
        }.bind(this));
        btnRow.appendChild(btnLand);

        var btnCamera = this._makeButton('C 카메라', '#4466aa');
        btnCamera.addEventListener('touchstart', function(e) {
            e.preventDefault();
            if (this.onCameraSwitch) this.onCameraSwitch();
        }.bind(this));
        btnRow.appendChild(btnCamera);

        var btnMission = this._makeButton('M 미션', '#aa4466');
        btnMission.addEventListener('touchstart', function(e) {
            e.preventDefault();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
        });
        btnRow.appendChild(btnMission);

        container.appendChild(btnRow);
        document.body.appendChild(container);

        this._container = container;
        this._leftArea = leftArea;
        this._rightArea = rightArea;
        this._leftKnob = leftKnob;
        this._rightKnob = rightKnob;
    };

    TouchControls.prototype._makeButton = function(text, color) {
        var btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = 'padding:10px 16px;border-radius:10px;border:1px solid ' + color + ';background:rgba(0,0,0,0.5);color:#fff;font-size:13px;font-weight:bold;font-family:inherit;cursor:pointer;';
        return btn;
    };

    TouchControls.prototype._bindTouch = function() {
        var self = this;
        var stickRadius = 40;

        function getStickCenter(area) {
            var rect = area.getBoundingClientRect();
            return { x: rect.left + 60, y: rect.top + 60 };
        }

        function handleStart(e) {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];
                var leftCenter = getStickCenter(self._leftArea);
                var rightCenter = getStickCenter(self._rightArea);

                var dxL = touch.clientX - leftCenter.x;
                var dyL = touch.clientY - leftCenter.y;
                var dxR = touch.clientX - rightCenter.x;
                var dyR = touch.clientY - rightCenter.y;

                if (Math.sqrt(dxL * dxL + dyL * dyL) < 80 && !self._leftStick.active) {
                    self._leftStick.active = true;
                    self._leftStick.touchId = touch.identifier;
                    self._leftStick.cx = leftCenter.x;
                    self._leftStick.cy = leftCenter.y;
                } else if (Math.sqrt(dxR * dxR + dyR * dyR) < 80 && !self._rightStick.active) {
                    self._rightStick.active = true;
                    self._rightStick.touchId = touch.identifier;
                    self._rightStick.cx = rightCenter.x;
                    self._rightStick.cy = rightCenter.y;
                }
            }
        }

        function handleMove(e) {
            e.preventDefault();
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];

                if (self._leftStick.active && touch.identifier === self._leftStick.touchId) {
                    var dx = touch.clientX - self._leftStick.cx;
                    var dy = touch.clientY - self._leftStick.cy;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > stickRadius) {
                        dx = dx / dist * stickRadius;
                        dy = dy / dist * stickRadius;
                    }
                    self._leftStick.dx = dx / stickRadius;
                    self._leftStick.dy = dy / stickRadius;
                    self._leftKnob.style.left = (40 + dx) + 'px';
                    self._leftKnob.style.top = (40 + dy) + 'px';
                }

                if (self._rightStick.active && touch.identifier === self._rightStick.touchId) {
                    var dx = touch.clientX - self._rightStick.cx;
                    var dy = touch.clientY - self._rightStick.cy;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > stickRadius) {
                        dx = dx / dist * stickRadius;
                        dy = dy / dist * stickRadius;
                    }
                    self._rightStick.dx = dx / stickRadius;
                    self._rightStick.dy = dy / stickRadius;
                    self._rightKnob.style.left = (40 + dx) + 'px';
                    self._rightKnob.style.top = (40 + dy) + 'px';
                }
            }
        }

        function handleEnd(e) {
            for (var i = 0; i < e.changedTouches.length; i++) {
                var touch = e.changedTouches[i];

                if (self._leftStick.active && touch.identifier === self._leftStick.touchId) {
                    self._leftStick.active = false;
                    self._leftStick.dx = 0;
                    self._leftStick.dy = 0;
                    self._leftKnob.style.left = '40px';
                    self._leftKnob.style.top = '40px';
                }

                if (self._rightStick.active && touch.identifier === self._rightStick.touchId) {
                    self._rightStick.active = false;
                    self._rightStick.dx = 0;
                    self._rightStick.dy = 0;
                    self._rightKnob.style.left = '40px';
                    self._rightKnob.style.top = '40px';
                }
            }
        }

        document.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
        document.addEventListener('touchcancel', handleEnd);
    };

    TouchControls.prototype.getInput = function() {
        this.input.roll = -this._leftStick.dx;
        this.input.pitch = -this._leftStick.dy;
        this.input.throttle = -this._rightStick.dy;
        this.input.yaw = -this._rightStick.dx;
        return this.input;
    };

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.TouchControls = TouchControls;
})();
