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
            this.onAction = null; // 액션 콜백 (시각적 피드백)
        }

        _notify(action) {
            if (this.onAction) this.onAction(action);
        }

        _sleep(ms) {
            var self = this;
            return new Promise(function (resolve) {
                var check = setInterval(function () {
                    if (self._cancelled) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
                setTimeout(function () {
                    clearInterval(check);
                    resolve();
                }, ms);
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
            var speed = 3; // m/s
            var duration = distance / speed;
            var yaw = this.physics.rotation.yaw;
            var cos = Math.cos(yaw);
            var sin = Math.sin(yaw);

            // 로컬 방향을 월드 좌표로 변환
            var worldX = dirX * cos - dirZ * sin;
            var worldZ = dirX * sin + dirZ * cos;

            var startTime = Date.now();
            return new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    var elapsed = (Date.now() - startTime) / 1000;
                    if (elapsed >= duration) {
                        clearInterval(interval);
                        resolve();
                        return;
                    }
                    self.physics.velocity.x = worldX * speed;
                    self.physics.velocity.z = worldZ * speed;
                }, 50);
            });
        }

        async moveForward(distance) {
            this._notify('앞으로 ' + distance + 'm');
            await this._moveDirection(0, -1, distance);
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
        }

        async moveBackward(distance) {
            this._notify('뒤로 ' + distance + 'm');
            await this._moveDirection(0, 1, distance);
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
        }

        async moveLeft(distance) {
            this._notify('왼쪽 ' + distance + 'm');
            await this._moveDirection(-1, 0, distance);
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
        }

        async moveRight(distance) {
            this._notify('오른쪽 ' + distance + 'm');
            await this._moveDirection(1, 0, distance);
            this.physics.velocity.x = 0;
            this.physics.velocity.z = 0;
        }

        async moveUp(distance) {
            this._notify('위로 ' + distance + 'm');
            var speed = 2;
            var duration = distance / speed;
            var self = this;
            var startTime = Date.now();
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    if ((Date.now() - startTime) / 1000 >= duration) {
                        clearInterval(interval); resolve(); return;
                    }
                    self.physics.velocity.y = speed;
                }, 50);
            });
            this.physics.velocity.y = 0;
        }

        async moveDown(distance) {
            this._notify('아래로 ' + distance + 'm');
            var speed = 2;
            var duration = distance / speed;
            var self = this;
            var startTime = Date.now();
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    if ((Date.now() - startTime) / 1000 >= duration) {
                        clearInterval(interval); resolve(); return;
                    }
                    self.physics.velocity.y = -speed;
                }, 50);
            });
            this.physics.velocity.y = 0;
        }

        async turnLeft(angle) {
            this._notify('왼쪽 회전 ' + angle + '도');
            var radians = angle * Math.PI / 180;
            var speed = Math.PI / 2; // 90도/초
            var duration = radians / speed;
            var self = this;
            var startTime = Date.now();
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    if ((Date.now() - startTime) / 1000 >= duration) {
                        clearInterval(interval); resolve(); return;
                    }
                    self.physics.rotation.yaw -= speed * 0.05;
                }, 50);
            });
        }

        async turnRight(angle) {
            this._notify('오른쪽 회전 ' + angle + '도');
            var radians = angle * Math.PI / 180;
            var speed = Math.PI / 2;
            var duration = radians / speed;
            var self = this;
            var startTime = Date.now();
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    if ((Date.now() - startTime) / 1000 >= duration) {
                        clearInterval(interval); resolve(); return;
                    }
                    self.physics.rotation.yaw += speed * 0.05;
                }, 50);
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
                        resolve();
                    }
                }, 100);
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
            });
        }

        /**
         * 비행 속도 설정
         */
        setSpeed(speed) {
            this._flightSpeed = Math.max(1, Math.min(10, speed));
            this._notify('속도: ' + this._flightSpeed + 'm/s');
        }

        // autopilot 없을 때 간단한 좌표 이동
        async _simpleFlyTo(tx, ty, tz) {
            var self = this;
            var speed = this._flightSpeed || 3;
            await new Promise(function (resolve) {
                var interval = setInterval(function () {
                    if (self._cancelled) { clearInterval(interval); resolve(); return; }
                    var dx = tx - self.physics.position.x;
                    var dy = ty - self.physics.position.y;
                    var dz = tz - self.physics.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < 0.5) {
                        self.physics.velocity.x = 0;
                        self.physics.velocity.y = 0;
                        self.physics.velocity.z = 0;
                        clearInterval(interval);
                        resolve();
                        return;
                    }

                    var scale = Math.min(speed, dist) / dist;
                    self.physics.velocity.x = dx * scale;
                    self.physics.velocity.y = dy * scale;
                    self.physics.velocity.z = dz * scale;
                }, 50);
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

        cancel() { this._cancelled = true; }
        reset() {
            this._cancelled = false;
            this._flightSpeed = 3;
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
                var asyncFn = new Function('drone', 'highlightBlock',
                    'return (async function() {\n' + code + '\n})();'
                );
                await asyncFn(drone, highlightBlock);

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
