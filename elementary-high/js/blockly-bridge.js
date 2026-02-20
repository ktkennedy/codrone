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

            // Target position
            var targetX = this.physics.position.x + worldDx * distance;
            var targetY = this.physics.position.y;
            var targetZ = this.physics.position.z + worldDz * distance;

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
            var startAlt = this.physics.position.y; // 회전 시작 고도 기록
            // 목표 yaw 절대값 계산
            var goalYaw = startYaw + direction * targetRadians;
            while (goalYaw > Math.PI) goalYaw -= 2 * Math.PI;
            while (goalYaw < -Math.PI) goalYaw += 2 * Math.PI;

            // 고도 유지 PD (RotorPy SE3Control 참조: kp_pos[z]*pos_err + kd_pos[z]*vel_err)
            // 회전 중 자이로 커플링/translational lift로 인한 고도 변화를 보상
            var maxVA = this.physics.maxVertAccel || 12;
            function altHoldThrottle() {
                var altErr = startAlt - self.physics.position.y;
                var altVel = self.physics.velocity ? self.physics.velocity.y : 0;
                var cmd = (2.0 * altErr - 1.5 * altVel) / maxVA;
                if (cmd > 0.3) cmd = 0.3;
                if (cmd < -0.3) cmd = -0.3;
                return cmd;
            }

            // Phase 1: PD 제어로 목표 각도까지 회전
            this._inputOverride = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
            var settleCount = 0;

            await new Promise(function (resolve) {
                var check = setInterval(function () {
                    if (self._cancelled) {
                        self._inputOverride = null;
                        clearInterval(check);
                        resolve();
                        return;
                    }

                    var currentYaw = self.physics.rotation.yaw;
                    var error = goalYaw - currentYaw;
                    while (error > Math.PI) error -= 2 * Math.PI;
                    while (error < -Math.PI) error += 2 * Math.PI;

                    var absError = Math.abs(error);
                    var angVel = self.physics.angularVelocity ? self.physics.angularVelocity.yaw : 0;
                    var absAngVel = Math.abs(angVel);

                    // 목표 근처 + 거의 안 움직이면 완료 (엄격한 기준)
                    if (absError < 0.03 && absAngVel < 0.05) {
                        settleCount++;
                        if (settleCount >= 8) { // 8프레임 연속 안정 = 240ms
                            clearInterval(check);
                            resolve();
                            return;
                        }
                    } else {
                        settleCount = 0;
                    }

                    // PD 제어: P=각도오차 방향으로, D=각속도 브레이크
                    var kp = 2.0;
                    var kd = 1.2;
                    var input = kp * error - kd * angVel;

                    // 최대 입력 클램프
                    var maxIn = 0.4;
                    if (input > maxIn) input = maxIn;
                    if (input < -maxIn) input = -maxIn;

                    self._inputOverride.yaw = input;
                    self._inputOverride.throttle = altHoldThrottle();
                }, 30);
                self._activeTimers.push(check);
            });

            // Phase 2: 회전 후 안정화 - 각속도가 완전히 0이 될 때까지 제동
            // _inputOverride를 유지하여 다음 명령이 시작되기 전에 완전 정지
            if (!this._cancelled) {
                this._inputOverride = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
                var brakeCount = 0;

                await new Promise(function (resolve) {
                    var brake = setInterval(function () {
                        if (self._cancelled) {
                            self._inputOverride = null;
                            clearInterval(brake);
                            resolve();
                            return;
                        }

                        var angVel = self.physics.angularVelocity ? self.physics.angularVelocity.yaw : 0;
                        var absAngVel = Math.abs(angVel);

                        // 각속도 거의 0이면 완료 카운트
                        if (absAngVel < 0.02) {
                            brakeCount++;
                            if (brakeCount >= 10) { // 10프레임 연속 정지 = 300ms
                                self._inputOverride = null;
                                clearInterval(brake);
                                resolve();
                                return;
                            }
                        } else {
                            brakeCount = 0;
                        }

                        // 적극적 제동: 각속도 반대 방향으로 입력
                        var brakeInput = -1.5 * angVel;
                        if (brakeInput > 0.3) brakeInput = 0.3;
                        if (brakeInput < -0.3) brakeInput = -0.3;
                        self._inputOverride.yaw = brakeInput;
                        self._inputOverride.throttle = altHoldThrottle();
                    }, 30);
                    self._activeTimers.push(brake);
                });
            }
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
