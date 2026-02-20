/**
 * Blockly ↔ 드론 시뮬레이터 브릿지
 * Blockly에서 생성된 코드를 드론 API로 변환하여 실행합니다.
 */
(function () {
    'use strict';

    class DroneAPI {
        constructor(physics) {
            this.physics = physics;
            this._running = false;
            this._cancelled = false;
            this._activeTimers = []; // 모든 활성 타이머 추적
            this._inputOverride = null; // {throttle, pitch, roll, yaw} or null — used by animate loop
            this.onAction = null; // 액션 콜백 (시각적 피드백)
        }

        _notify(action) {
            if (this.onAction) this.onAction(action);
        }

        getInputOverride() {
            return this._inputOverride;
        }

        _sleep(ms) {
            var self = this;
            return new Promise(function (resolve) {
                var resolved = false;
                var check = setInterval(function () {
                    if (self._cancelled) {
                        clearInterval(check);
                        clearTimeout(timeout);
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    }
                }, 100);
                var timeout = setTimeout(function () {
                    clearInterval(check);
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                }, ms);
                self._activeTimers.push(check, timeout);
            });
        }

        async takeoff() {
            this._notify('이륙');
            this.physics.takeoff(3);
            await this._sleep(2000);
        }

        async land() {
            this._notify('착륙');
            this.physics.land();
            await this._sleep(2500);
        }

        async hover(seconds) {
            this._notify('호버링 ' + seconds + '초');
            await this._sleep(seconds * 1000);
        }

        async wait(seconds) {
            this._notify('대기 ' + seconds + '초');
            await this._sleep(seconds * 1000);
        }

        async _moveDirection(dirX, dirZ, distance) {
            var self = this;
            var yaw = this.physics.rotation.yaw;
            var cos = Math.cos(yaw);
            var sin = Math.sin(yaw);

            // Local direction -> world coordinates
            var worldDx = dirX * cos - dirZ * sin;
            var worldDz = dirX * sin + dirZ * cos;

            var autopilot = this._getAutopilot();
            if (autopilot) {
                // 턴 후 안정화 대기: SE3 컨트롤러가 정착할 시간 확보
                this.physics.holdPosition();
                await this._sleep(300);
                if (this._cancelled) return;

                // 안정화 후 현재 위치 기준으로 목표 재계산 (드리프트 보정)
                var targetX = this.physics.position.x + worldDx * distance;
                var targetY = this.physics.position.y;
                var targetZ = this.physics.position.z + worldDz * distance;

                var prevThreshold = autopilot.arrivalThreshold;
                autopilot.arrivalThreshold = 0.3;
                autopilot.flyTo(targetX, targetY, targetZ);
                await new Promise(function (resolve) {
                    var check = setInterval(function () {
                        if (self._cancelled || !autopilot.isNavigating) {
                            clearInterval(check);
                            autopilot.stop();
                            self.physics.holdPosition();
                            autopilot.arrivalThreshold = prevThreshold;
                            resolve();
                        }
                    }, 100);
                    self._activeTimers.push(check);
                });
            }
        }

        async moveForward(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('앞으로 ' + distance + 'm');
            await this._moveDirection(0, -1, distance);
        }

        async moveBackward(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('뒤로 ' + distance + 'm');
            await this._moveDirection(0, 1, distance);
        }

        async moveLeft(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('왼쪽 ' + distance + 'm');
            await this._moveDirection(-1, 0, distance);
        }

        async moveRight(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('오른쪽 ' + distance + 'm');
            await this._moveDirection(1, 0, distance);
        }

        async moveUp(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('위로 ' + distance + 'm');
            var targetX = this.physics.position.x;
            var targetY = this.physics.position.y + distance;
            var targetZ = this.physics.position.z;
            var self = this;

            var autopilot = this._getAutopilot();
            if (autopilot) {
                var prevThreshold = autopilot.arrivalThreshold;
                autopilot.arrivalThreshold = 0.3;
                autopilot.flyTo(targetX, targetY, targetZ);
                await new Promise(function (resolve) {
                    var check = setInterval(function () {
                        if (self._cancelled || !autopilot.isNavigating) {
                            clearInterval(check);
                            autopilot.stop();
                            self.physics.holdPosition();
                            autopilot.arrivalThreshold = prevThreshold;
                            resolve();
                        }
                    }, 100);
                    self._activeTimers.push(check);
                });
            }
        }

        async moveDown(distance) {
            distance = Math.max(0, Math.min(100, Number(distance) || 0));
            this._notify('아래로 ' + distance + 'm');
            var targetX = this.physics.position.x;
            var targetY = Math.max(0.5, this.physics.position.y - distance);
            var targetZ = this.physics.position.z;
            var self = this;

            var autopilot = this._getAutopilot();
            if (autopilot) {
                var prevThreshold = autopilot.arrivalThreshold;
                autopilot.arrivalThreshold = 0.3;
                autopilot.flyTo(targetX, targetY, targetZ);
                await new Promise(function (resolve) {
                    var check = setInterval(function () {
                        if (self._cancelled || !autopilot.isNavigating) {
                            clearInterval(check);
                            autopilot.stop();
                            self.physics.holdPosition();
                            autopilot.arrivalThreshold = prevThreshold;
                            resolve();
                        }
                    }, 100);
                    self._activeTimers.push(check);
                });
            }
        }

        async turnLeft(angle) {
            angle = Math.max(0, Math.min(360, Number(angle) || 0));
            if (angle < 1) return;
            this._notify('왼쪽 회전 ' + angle + '도');
            await this._doTurn(angle * Math.PI / 180, 0.6);
        }

        async turnRight(angle) {
            angle = Math.max(0, Math.min(360, Number(angle) || 0));
            if (angle < 1) return;
            this._notify('오른쪽 회전 ' + angle + '도');
            await this._doTurn(angle * Math.PI / 180, -0.6);
        }

        async _doTurn(targetRadians, yawInput) {
            var self = this;
            var direction = yawInput > 0 ? 1 : -1;
            var startYaw = this.physics.rotation.yaw;

            // 목표 yaw 계산
            var goalYaw = startYaw + direction * targetRadians;
            while (goalYaw > Math.PI) goalYaw -= 2 * Math.PI;
            while (goalYaw < -Math.PI) goalYaw += 2 * Math.PI;

            // SE3 위치 고정 좌표
            var holdX = this.physics.position.x;
            var holdY = this.physics.position.y;
            var holdZ = this.physics.position.z;

            // 점진적 yaw 보간: SE3에 작은 yaw 오차만 전달하여 모터 포화 방지
            var maxYawRate = 1.5;  // rad/s
            var currentTargetYaw = startYaw;
            var settleCount = 0;
            var lastTime = Date.now();

            // 초기 flat output (현재 yaw로 시작)
            this.physics.setFlatOutput({
                x: [holdX, holdY, holdZ],
                x_dot: [0, 0, 0],
                x_ddot: [0, 0, 0],
                yaw: currentTargetYaw,
                yaw_dot: 0
            });

            await new Promise(function (resolve) {
                var check = setInterval(function () {
                    if (self._cancelled) {
                        self.physics.clearFlatOutput();
                        clearInterval(check);
                        resolve();
                        return;
                    }

                    // 시간 기반 yaw 보간
                    var now = Date.now();
                    var dt = (now - lastTime) / 1000;
                    lastTime = now;

                    // 목표까지 남은 오차
                    var remaining = goalYaw - currentTargetYaw;
                    while (remaining > Math.PI) remaining -= 2 * Math.PI;
                    while (remaining < -Math.PI) remaining += 2 * Math.PI;

                    // maxYawRate로 점진 이동
                    var step = maxYawRate * dt;
                    var yawDotFF = 0;
                    if (Math.abs(remaining) <= step) {
                        currentTargetYaw = goalYaw;
                    } else {
                        currentTargetYaw += (remaining > 0 ? step : -step);
                        yawDotFF = remaining > 0 ? maxYawRate : -maxYawRate;
                    }
                    while (currentTargetYaw > Math.PI) currentTargetYaw -= 2 * Math.PI;
                    while (currentTargetYaw < -Math.PI) currentTargetYaw += 2 * Math.PI;

                    // flat output 업데이트 (점진적 yaw + 속도 피드포워드)
                    self.physics.setFlatOutput({
                        x: [holdX, holdY, holdZ],
                        x_dot: [0, 0, 0],
                        x_ddot: [0, 0, 0],
                        yaw: currentTargetYaw,
                        yaw_dot: yawDotFF
                    });

                    // 실제 yaw 수렴 확인
                    var actualYaw = self.physics.rotation.yaw;
                    var actualError = goalYaw - actualYaw;
                    while (actualError > Math.PI) actualError -= 2 * Math.PI;
                    while (actualError < -Math.PI) actualError += 2 * Math.PI;

                    var angVel = self.physics.angularVelocity ? self.physics.angularVelocity.yaw : 0;

                    if (Math.abs(actualError) < 0.03 && Math.abs(angVel) < 0.05) {
                        settleCount++;
                        if (settleCount >= 8) {
                            // Hold position at final yaw (no control gap)
                            self.physics.holdPosition();
                            clearInterval(check);
                            resolve();
                            return;
                        }
                    } else {
                        settleCount = 0;
                    }
                }, 30);
                self._activeTimers.push(check);
            });
        }

        // ===== 자율비행 (Autopilot) =====

        /**
         * 절대 좌표로 비행
         */
        async flyTo(x, y, z) {
            this._notify('(' + x + ', ' + y + ', ' + z + ') 으로 비행');
            var self = this;
            var autopilot = this._getAutopilot();
            if (!autopilot) {
                // autopilot 없으면 간단한 이동으로 대체
                await this._simpleFlyTo(x, y, z);
                return;
            }

            autopilot.flyTo(x, y, z);

            await new Promise(function (resolve) {
                var check = setInterval(function () {
                    if (self._cancelled || !autopilot.isNavigating) {
                        clearInterval(check);
                        autopilot.stop();
                        self.physics.holdPosition();
                        resolve();
                    }
                }, 100);
                self._activeTimers.push(check);
            });
        }

        /**
         * 홈 위치로 귀환
         */
        async returnHome() {
            this._notify('홈으로 귀환');
            var autopilot = this._getAutopilot();
            if (autopilot) {
                autopilot.returnHome();
                var self = this;
                await new Promise(function (resolve) {
                    var check = setInterval(function () {
                        if (self._cancelled || !autopilot.isNavigating) {
                            clearInterval(check);
                            autopilot.stop();
                            self.physics.holdPosition();
                            resolve();
                        }
                    }, 100);
                    self._activeTimers.push(check);
                });
            } else {
                await this._simpleFlyTo(0, 3, 0);
            }
        }

        /**
         * 웨이포인트 경로 비행
         * @param {Array} points - [{x, y, z}, ...] 배열
         */
        async followPath(points) {
            this._notify('경로 비행 (' + points.length + '개 지점)');
            var autopilot = this._getAutopilot();
            if (!autopilot) {
                for (var i = 0; i < points.length; i++) {
                    if (this._cancelled) break;
                    var p = points[i];
                    await this._simpleFlyTo(p.x, p.y, p.z);
                }
                return;
            }

            autopilot.followPath(points);
            var self = this;
            await new Promise(function (resolve) {
                var prevOnComplete = autopilot.onNavigationComplete;
                autopilot.onNavigationComplete = function () {
                    if (prevOnComplete) prevOnComplete();
                    resolve();
                };
                var check = setInterval(function () {
                    if (self._cancelled) {
                        clearInterval(check);
                        autopilot.stop();
                        self.physics.holdPosition();
                        resolve();
                    }
                }, 100);
                self._activeTimers.push(check);
            });
        }

        /**
         * 비행 속도 설정
         */
        setSpeed(speed) {
            this._flightSpeed = Math.max(1, Math.min(10, speed));
            // autopilot에도 속도 전달
            var autopilot = this._getAutopilot();
            if (autopilot) autopilot.flightSpeed = this._flightSpeed;
            this._notify('속도: ' + this._flightSpeed + 'm/s');
        }

        // autopilot 없을 때 간단한 좌표 이동
        async _simpleFlyTo(tx, ty, tz) {
            var self = this;
            var autopilot = this._getAutopilot();
            if (autopilot) {
                var prevThreshold = autopilot.arrivalThreshold;
                autopilot.arrivalThreshold = 0.3;
                autopilot.flyTo(tx, ty, tz);
                await new Promise(function (resolve) {
                    var check = setInterval(function () {
                        if (self._cancelled || !autopilot.isNavigating) {
                            clearInterval(check);
                            autopilot.stop();
                            self.physics.holdPosition();
                            autopilot.arrivalThreshold = prevThreshold;
                            resolve();
                        }
                    }, 100);
                    self._activeTimers.push(check);
                });
                return;
            }
            // Fallback with input override (no autopilot)
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { self._inputOverride = null; clearInterval(interval); resolve(); return; }
                    var dx = tx - self.physics.position.x;
                    var dy = ty - self.physics.position.y;
                    var dz = tz - self.physics.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 0.5) {
                        self._inputOverride = null;
                        clearInterval(interval);
                        resolve();
                        return;
                    }
                    // Simple proportional control as input
                    var yaw = self.physics.rotation.yaw;
                    var cos = Math.cos(yaw);
                    var sin = Math.sin(yaw);
                    var localFwd = -(dx * sin + dz * cos);
                    var localRight = dx * cos - dz * sin;
                    var maxIn = 0.5;
                    var s = Math.min(1, dist / 3);
                    self._inputOverride = {
                        throttle: Math.max(-maxIn, Math.min(maxIn, dy * 0.5)),
                        pitch: Math.max(-maxIn, Math.min(maxIn, localFwd * 0.3 * s)),
                        roll: Math.max(-maxIn, Math.min(maxIn, -localRight * 0.3 * s)),
                        yaw: 0
                    };
                }, 50);
                self._activeTimers.push(interval);
            });
        }

        _getAutopilot() {
            return this._autopilot || null;
        }

        setAutopilot(autopilot) {
            this._autopilot = autopilot;
        }

        // ===== 센서 =====

        getAltitude() { return Math.round(this.physics.position.y * 10) / 10; }
        getSpeed() { var s = this.physics.getState(); return Math.round(s.speed * 10) / 10; }
        getBattery() { return Math.round(this.physics.battery); }

        getPositionX() { return Math.round(this.physics.position.x * 10) / 10; }
        getPositionY() { return Math.round(this.physics.position.y * 10) / 10; }
        getPositionZ() { return Math.round(this.physics.position.z * 10) / 10; }

        getDistanceTo(x, z) {
            var dx = x - this.physics.position.x;
            var dz = z - this.physics.position.z;
            return Math.round(Math.sqrt(dx * dx + dz * dz) * 10) / 10;
        }

        getFrontDistance() {
            if (this._sensors) return this._sensors.getFrontDistance();
            return 50;
        }

        getGroundColor() {
            if (this._sensors) return this._sensors.getGroundColor();
            return 'green';
        }

        setSensors(sensors) {
            this._sensors = sensors;
        }

        cancel() {
            this.physics.clearFlatOutput();
            this._inputOverride = null;
            this._cancelled = true;
            // Clear all active timers
            for (var i = 0; i < this._activeTimers.length; i++) {
                clearInterval(this._activeTimers[i]);
                clearTimeout(this._activeTimers[i]);
            }
            this._activeTimers = [];
        }
        reset() {
            this.physics.clearFlatOutput();
            this._inputOverride = null;
            this._cancelled = false;
            this._flightSpeed = 3;
            this._activeTimers = [];
        }
    }

    class BlocklyBridge {
        constructor(physics, workspace) {
            this.drone = new DroneAPI(physics);
            this.workspace = workspace;
            this.isRunning = false;
            this._highlightedBlock = null;

            this.onStart = null;
            this.onComplete = null;
            this.onError = null;
            this.onCodeGenerated = null;
            this.onConsoleLog = null;
        }

        generateCode() {
            var gen = Blockly.JavaScript;
            gen.STATEMENT_PREFIX = 'await highlightBlock(%1);\n';
            gen.STATEMENT_SUFFIX = '';
            gen.addReservedWords('highlightBlock,drone');
            var code = gen.workspaceToCode(this.workspace);
            if (this.onCodeGenerated) this.onCodeGenerated(code);
            return code;
        }

        async run() {
            if (this.isRunning) return;
            this.isRunning = true;
            this.drone.reset();

            if (this.onStart) this.onStart();

            var code = this.generateCode();

            // highlightBlock 함수 정의
            var self = this;
            var highlightBlock = async function (blockId) {
                if (self._highlightedBlock) {
                    self.workspace.highlightBlock(self._highlightedBlock, false);
                }
                self.workspace.highlightBlock(blockId, true);
                self._highlightedBlock = blockId;
                await self.drone._sleep(100);
            };

            try {
                var drone = this.drone;
                var self = this;
                var customConsole = {
                    log: function() {
                        var msg = Array.from(arguments).join(' ');
                        if (self.onConsoleLog) self.onConsoleLog(msg);
                    }
                };
                var asyncFn = new Function('drone', 'highlightBlock', 'console', 'window', 'document', 'localStorage', 'fetch',
                    'return (async function() {\n' + code + '\n})();'
                );
                await asyncFn(drone, highlightBlock, customConsole, undefined, undefined, undefined, undefined);

                if (this._highlightedBlock) {
                    this.workspace.highlightBlock(this._highlightedBlock, false);
                }

                if (this.onComplete) this.onComplete();
            } catch (e) {
                if (this.onError) this.onError(e.message);
            }

            this.isRunning = false;
        }

        stop() {
            this.drone.cancel();
            this.isRunning = false;
            if (this._highlightedBlock) {
                this.workspace.highlightBlock(this._highlightedBlock, false);
                this._highlightedBlock = null;
            }
        }
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.DroneAPI = DroneAPI;
    window.DroneSim.BlocklyBridge = BlocklyBridge;
})();
