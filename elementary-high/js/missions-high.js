/**
 * 고학년 미션 정의 (15개)
 * 더 복잡하고 도전적인 미션으로 드론 조종 실력을 키웁니다.
 */
(function () {
    'use strict';

    // 웨이포인트 색상 팔레트
    var WP_COLORS = [0xff4444, 0xff8800, 0xffff00, 0x44ff44, 0x4488ff, 0xaa44ff, 0xff44aa, 0x44ffff];

    /**
     * 웨이포인트 시각화 헬퍼
     * 크고 눈에 띄는 마커 + 번호 라벨 + 연결 라인 + 지면 마커 생성
     *
     * @param {THREE.Scene} scene
     * @param {Array} targets - [{x, y, z}, ...]
     * @param {Array} collectibles - 기존 collectibles 배열 (even=sphere, odd=beam)
     * @param {Array} extraVisuals - 추가 시각 요소 배열 (cleanup용)
     * @param {Object} opts - { sphereRadius, activeIdx }
     */
    function createWaypointVisuals(scene, targets, collectibles, extraVisuals, opts) {
        opts = opts || {};
        var radius = opts.sphereRadius || 0.8;
        var activeIdx = opts.activeIdx || 0;

        targets.forEach(function (pos, i) {
            var color = WP_COLORS[i % WP_COLORS.length];

            // 타겟 구체 (크고 밝은)
            var geo = new THREE.SphereGeometry(radius, 16, 16);
            var mat = new THREE.MeshBasicMaterial({
                color: color, transparent: true,
                opacity: i === activeIdx ? 1.0 : 0.5
            });
            var sphere = new THREE.Mesh(geo, mat);
            sphere.position.set(pos.x, pos.y, pos.z);
            scene.add(sphere);
            collectibles.push(sphere);  // even index

            // 수직 빔 (지면 → 타겟)
            var beamH = Math.max(pos.y, 0.5);
            var beamGeo = new THREE.CylinderGeometry(0.04, 0.04, beamH, 8);
            var beamMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true,
                opacity: i === activeIdx ? 0.5 : 0.2
            });
            var beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(pos.x, beamH / 2, pos.z);
            scene.add(beam);
            collectibles.push(beam);  // odd index
        });

        // 번호 라벨 스프라이트
        targets.forEach(function (pos, i) {
            var color = WP_COLORS[i % WP_COLORS.length];
            var canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            var ctx = canvas.getContext('2d');
            // 배경 원
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill();
            // 테두리
            var hex = '#' + ('000000' + color.toString(16)).slice(-6);
            ctx.strokeStyle = hex;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.stroke();
            // 번호
            ctx.fillStyle = hex;
            ctx.font = 'bold 34px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(i + 1), 32, 34);
            var texture = new THREE.CanvasTexture(canvas);
            var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
            var sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(pos.x, pos.y + 1.5, pos.z);
            sprite.scale.set(2, 2, 1);
            scene.add(sprite);
            extraVisuals.push(sprite);
        });

        // 경로 연결선
        if (targets.length > 1) {
            var linePoints = targets.map(function (t) { return new THREE.Vector3(t.x, t.y, t.z); });
            var lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
            var lineMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5 });
            var line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            extraVisuals.push(line);
        }

        // 지면 마커 (링)
        targets.forEach(function (pos, i) {
            var color = WP_COLORS[i % WP_COLORS.length];
            var ringGeo = new THREE.RingGeometry(0.6, 1.0, 32);
            var ringMat = new THREE.MeshBasicMaterial({
                color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.4
            });
            var ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(pos.x, 0.02, pos.z);
            ring.rotation.x = -Math.PI / 2;
            scene.add(ring);
            extraVisuals.push(ring);
        });
    }

    /**
     * 추가 시각 요소 정리
     */
    function cleanupVisuals(scene, arr) {
        arr.forEach(function (obj) {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(function (m) { m.dispose(); });
                } else {
                    obj.material.dispose();
                }
            }
        });
    }

    function createHighMissions() {
        return [
            // 미션 1: 이륙과 착륙
            {
                name: '이륙과 착륙',
                description: '드론의 기본! 안전하게 이륙하고 착륙하세요.',
                timeLimit: 60,
                objectives: [
                    {
                        description: '5m 높이까지 이륙',
                        check: function (state) { return state.altitude > 5; }
                    },
                    {
                        description: '10초 동안 호버링',
                        _hoverStart: null,
                        check: function (state, time) {
                            if (state.altitude > 4 && state.altitude < 6) {
                                if (!this._hoverStart) this._hoverStart = time;
                                return time - this._hoverStart > 10;
                            }
                            this._hoverStart = null;
                            return false;
                        }
                    },
                    {
                        description: '부드럽게 착륙 (1.5m 이내)',
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                            return !state.isFlying && state.altitude < 0.3 && dist < 1.5;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 35; },
                    threeStar: function (time) { return time < 20; }
                }
            },

            // 미션 2: 정밀 비행
            {
                name: '정밀 비행',
                description: '번호 순서대로 웨이포인트를 방문하세요!',
                timeLimit: 90,
                collectibles: [],
                _extraVisuals: [],
                _currentTarget: 0,
                _targets: [
                    { x: 10, y: 5, z: 0 },
                    { x: 10, y: 10, z: 10 },
                    { x: 0, y: 8, z: 10 },
                    { x: -10, y: 6, z: 0 },
                    { x: 0, y: 4, z: -10 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentTarget = 0;
                    createWaypointVisuals(scene, this._targets, this.collectibles, this._extraVisuals);
                },
                cleanup: function (scene) {
                    cleanupVisuals(scene, this.collectibles);
                    cleanupVisuals(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (this._currentTarget >= 5) return;
                    var target = this.collectibles[this._currentTarget * 2];
                    var beam = this.collectibles[this._currentTarget * 2 + 1];
                    var dx = state.position.x - target.position.x;
                    var dy = state.position.y - target.position.y;
                    var dz = state.position.z - target.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 1.5) {
                        target.material.opacity = 0.1;
                        if (beam) beam.material.opacity = 0.05;
                        this._currentTarget++;
                        if (this._currentTarget < 5) {
                            this.collectibles[this._currentTarget * 2].material.opacity = 1;
                            this.collectibles[this._currentTarget * 2 + 1].material.opacity = 0.5;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째, 두 번째 좌표 방문',
                        check: function (s, t, m) { return m._currentTarget >= 2; }
                    },
                    {
                        description: '세 번째, 네 번째 좌표 방문',
                        check: function (s, t, m) { return m._currentTarget >= 4; }
                    },
                    {
                        description: '모든 좌표 방문 완료!',
                        check: function (s, t, m) { return m._currentTarget >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 55; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 3: 고도 유지
            {
                name: '고도 유지',
                description: '일정한 높이를 유지하며 이동하세요.',
                timeLimit: 90,
                collectibles: [],
                _passedCheckpoints: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passedCheckpoints = 0;
                    var checkpoints = [
                        { x: 0, z: 0 },
                        { x: 15, z: 0 },
                        { x: 15, z: 15 },
                        { x: 0, z: 15 }
                    ];
                    var self = this;
                    checkpoints.forEach(function (pos, i) {
                        // 체크포인트 링 (높이 8m)
                        var geo = new THREE.TorusGeometry(1.5, 0.1, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xffaa00,
                            transparent: true,
                            opacity: 0.6
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, 8, pos.z);
                        ring.rotation.x = Math.PI / 2;
                        ring.userData.passed = false;
                        scene.add(ring);
                        self.collectibles.push(ring);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    this.collectibles.forEach(function (ring) {
                        if (ring.userData.passed) return;
                        var dx = state.position.x - ring.position.x;
                        var dy = state.position.y - ring.position.y;
                        var dz = state.position.z - ring.position.z;
                        var dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < 2 && Math.abs(dy) < 1.5) {
                            ring.userData.passed = true;
                            ring.material.opacity = 0.15;
                            self._passedCheckpoints++;
                        }
                    });
                },
                objectives: [
                    {
                        description: '8m 고도로 이륙',
                        check: function (state) { return state.altitude > 7.5 && state.altitude < 8.5; }
                    },
                    {
                        description: '첫 번째, 두 번째 체크포인트 통과',
                        check: function (s, t, m) { return m._passedCheckpoints >= 2; }
                    },
                    {
                        description: '모든 체크포인트 통과!',
                        check: function (s, t, m) { return m._passedCheckpoints >= 4; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 55; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 4: 8자 비행
            {
                name: '8자 비행',
                description: '8자 모양으로 비행하며 모든 체크포인트를 통과하세요!',
                timeLimit: 120,
                collectibles: [],
                _currentCheckpoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentCheckpoint = 0;
                    // 8자 패턴 포인트
                    var points = [
                        { x: 0, y: 5, z: 0 },
                        { x: 5, y: 6, z: 5 },
                        { x: 7, y: 7, z: 0 },
                        { x: 5, y: 6, z: -5 },
                        { x: 0, y: 5, z: 0 },
                        { x: -5, y: 6, z: 5 },
                        { x: -7, y: 7, z: 0 },
                        { x: -5, y: 6, z: -5 }
                    ];
                    var self = this;
                    points.forEach(function (pos, i) {
                        var geo = new THREE.SphereGeometry(0.5, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff00ff,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        scene.add(marker);
                        self.collectibles.push(marker);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentCheckpoint >= 8) return;
                    var marker = this.collectibles[this._currentCheckpoint];
                    var dx = state.position.x - marker.position.x;
                    var dy = state.position.y - marker.position.y;
                    var dz = state.position.z - marker.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 2) {
                        marker.material.opacity = 0.1;
                        this._currentCheckpoint++;
                        if (this._currentCheckpoint < 8) {
                            this.collectibles[this._currentCheckpoint].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 원 완성 (4개 포인트)',
                        check: function (s, t, m) { return m._currentCheckpoint >= 4; }
                    },
                    {
                        description: '두 번째 원 절반 (6개 포인트)',
                        check: function (s, t, m) { return m._currentCheckpoint >= 6; }
                    },
                    {
                        description: '8자 패턴 완성!',
                        check: function (s, t, m) { return m._currentCheckpoint >= 8; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 5: 장애물 코스
            {
                name: '장애물 코스',
                description: '장애물을 피해 골에 도착하세요! 장애물 충돌 시 실패!',
                timeLimit: 120,
                collectibles: [],
                _reachedGoal: false,
                _hitObstacle: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedGoal = false;
                    this._hitObstacle = false;
                    // 장애물 기둥
                    var obstacles = [
                        { x: 5, z: 0, h: 12 },
                        { x: 10, z: 3, h: 8 },
                        { x: 10, z: -3, h: 15 },
                        { x: 16, z: 0, h: 10 },
                        { x: 22, z: 2, h: 14 },
                        { x: 22, z: -4, h: 7 }
                    ];
                    var self = this;
                    obstacles.forEach(function (obs) {
                        var geo = new THREE.CylinderGeometry(0.8, 0.8, obs.h, 8);
                        var mat = new THREE.MeshPhongMaterial({
                            color: 0xff4444,
                            transparent: true,
                            opacity: 0.7
                        });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(obs.x, obs.h / 2, obs.z);
                        mesh.userData.isObstacle = true;
                        mesh.userData.radius = 0.8;
                        mesh.userData.height = obs.h;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });
                    // 골 링
                    var goalGeo = new THREE.TorusGeometry(2, 0.15, 8, 24);
                    var goalMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
                    var goal = new THREE.Mesh(goalGeo, goalMat);
                    goal.position.set(28, 6, 0);
                    goal.rotation.y = Math.PI / 2;
                    scene.add(goal);
                    self.collectibles.push(goal);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    // 장애물 충돌 체크
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        if (!obj.userData.isObstacle) return;
                        var dx = state.position.x - obj.position.x;
                        var dz = state.position.z - obj.position.z;
                        var dist2d = Math.sqrt(dx * dx + dz * dz);
                        if (dist2d < obj.userData.radius + 0.3 && state.position.y < obj.userData.height) {
                            self._hitObstacle = true;
                        }
                    });
                    // 골 체크
                    var goalDist = Math.sqrt(
                        (state.position.x - 28) * (state.position.x - 28) +
                        (state.position.y - 6) * (state.position.y - 6) +
                        state.position.z * state.position.z
                    );
                    if (goalDist < 2.5) this._reachedGoal = true;
                },
                failCondition: function (state, time) {
                    return this._hitObstacle;
                },
                failMessage: '장애물에 부딪혔어요!',
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '장애물 사이를 지나가기',
                        check: function (state) { return state.position.x > 15; }
                    },
                    {
                        description: '골든 링에 도착!',
                        check: function (s, t, m) { return m._reachedGoal; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 6: 링 레이스
            {
                name: '링 레이스',
                description: '모든 링을 빠르게 통과하세요! 시간이 촉박해요!',
                timeLimit: 50,
                collectibles: [],
                _passed: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passed = 0;
                    var positions = [
                        { x: 8, y: 5, z: 0, rx: 0, ry: Math.PI / 2 },
                        { x: 15, y: 7, z: 8, rx: 0, ry: 0 },
                        { x: 8, y: 9, z: 15, rx: 0, ry: -Math.PI / 4 },
                        { x: -5, y: 6, z: 15, rx: 0, ry: Math.PI / 2 },
                        { x: -10, y: 8, z: 5, rx: 0, ry: Math.PI / 4 },
                        { x: 0, y: 4, z: 0, rx: Math.PI / 2, ry: 0 }
                    ];
                    var self = this;
                    positions.forEach(function (pos, i) {
                        var geo = new THREE.TorusGeometry(1.5, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff0088,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, pos.y, pos.z);
                        ring.rotation.x = pos.rx;
                        ring.rotation.y = pos.ry;
                        scene.add(ring);
                        self.collectibles.push(ring);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._passed >= this.collectibles.length) return;
                    var ring = this.collectibles[this._passed];
                    var dist = Math.sqrt(
                        (state.position.x - ring.position.x) * (state.position.x - ring.position.x) +
                        (state.position.y - ring.position.y) * (state.position.y - ring.position.y) +
                        (state.position.z - ring.position.z) * (state.position.z - ring.position.z)
                    );
                    if (dist < 2) {
                        ring.material.opacity = 0.1;
                        this._passed++;
                        if (this._passed < this.collectibles.length) {
                            this.collectibles[this._passed].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '링 1, 2 통과',
                        check: function (s, t, m) { return m._passed >= 2; }
                    },
                    {
                        description: '링 3, 4, 5 통과',
                        check: function (s, t, m) { return m._passed >= 5; }
                    },
                    {
                        description: '모든 링 통과 - 완주!',
                        check: function (s, t, m) { return m._passed >= 6; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 35; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 7: 택배 배달
            {
                name: '택배 배달',
                description: 'A지점에서 화물을 싣고 B지점으로 배달하세요.',
                timeLimit: 90,
                collectibles: [],
                _pickedUp: false,
                _delivered: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._pickedUp = false;
                    this._delivered = false;
                    // A 지점 (화물)
                    var boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                    var boxMat = new THREE.MeshPhongMaterial({ color: 0xff8844 });
                    var box = new THREE.Mesh(boxGeo, boxMat);
                    box.position.set(15, 0.4, 15);
                    scene.add(box);
                    this.collectibles.push(box);
                    this._cargo = box;
                    // A 지점 마커
                    var markerA = this._createMarker(scene, 15, 15, 0x44ff88, 'A');
                    this.collectibles.push(markerA);
                    // B 지점 마커
                    var markerB = this._createMarker(scene, -20, -15, 0xff4444, 'B');
                    this.collectibles.push(markerB);
                },
                _createMarker: function (scene, x, z, color, label) {
                    var group = new THREE.Group();
                    var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
                    var poleMat = new THREE.MeshPhongMaterial({ color: color });
                    var pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.y = 1.5;
                    group.add(pole);
                    var flagGeo = new THREE.PlaneGeometry(1, 0.6);
                    var flagMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
                    var flag = new THREE.Mesh(flagGeo, flagMat);
                    flag.position.set(0.5, 2.7, 0);
                    group.add(flag);
                    group.position.set(x, 0, z);
                    scene.add(group);
                    return group;
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    // 화물 픽업
                    if (!this._pickedUp) {
                        var dist = Math.sqrt(
                            (state.position.x - 15) * (state.position.x - 15) +
                            (state.position.y - 2) * (state.position.y - 2) +
                            (state.position.z - 15) * (state.position.z - 15)
                        );
                        if (dist < 2) {
                            this._pickedUp = true;
                        }
                    }
                    // 화물 따라다니기
                    if (this._pickedUp && this._cargo && !this._delivered) {
                        this._cargo.position.set(
                            state.position.x,
                            state.position.y - 0.5,
                            state.position.z
                        );
                    }
                    // 배달
                    if (this._pickedUp && !this._delivered) {
                        var dist2 = Math.sqrt(
                            (state.position.x + 20) * (state.position.x + 20) +
                            (state.position.z + 15) * (state.position.z + 15)
                        );
                        if (dist2 < 3 && state.altitude < 3) {
                            this._delivered = true;
                            if (this._cargo) {
                                this._cargo.position.set(-20, 0.4, -15);
                            }
                        }
                    }
                },
                objectives: [
                    {
                        description: 'A 지점에서 화물 싣기',
                        check: function (s, t, m) { return m._pickedUp; }
                    },
                    {
                        description: 'B 지점으로 이동',
                        check: function (state, t, m) {
                            return m._pickedUp && Math.sqrt(
                                (state.position.x + 20) * (state.position.x + 20) +
                                (state.position.z + 15) * (state.position.z + 15)
                            ) < 10;
                        }
                    },
                    {
                        description: 'B 지점에 배달 완료!',
                        check: function (s, t, m) { return m._delivered; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 8: 정찰 비행
            {
                name: '정찰 비행',
                description: '모든 정찰 포인트를 방문하고 출발 지점으로 돌아오세요.',
                timeLimit: 120,
                collectibles: [],
                _visitedCount: 0,
                _returnedHome: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._visitedCount = 0;
                    this._returnedHome = false;
                    var scoutPoints = [
                        { x: 20, y: 6, z: 20, color: 0xff4444 },
                        { x: -20, y: 8, z: 20, color: 0x44ff44 },
                        { x: -20, y: 7, z: -20, color: 0x4444ff },
                        { x: 20, y: 5, z: -20, color: 0xffff44 }
                    ];
                    var self = this;
                    scoutPoints.forEach(function (point, i) {
                        // 정찰 포인트
                        var geo = new THREE.ConeGeometry(0.5, 1.5, 8);
                        var mat = new THREE.MeshBasicMaterial({
                            color: point.color,
                            transparent: true,
                            opacity: 0.8
                        });
                        var cone = new THREE.Mesh(geo, mat);
                        cone.position.set(point.x, point.y, point.z);
                        cone.userData.visited = false;
                        scene.add(cone);
                        self.collectibles.push(cone);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, point.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: point.color });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(point.x, point.y / 2, point.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    // 정찰 포인트 체크
                    for (var i = 0; i < 4; i++) {
                        var cone = this.collectibles[i * 2];
                        if (cone.userData.visited) continue;
                        var dx = state.position.x - cone.position.x;
                        var dy = state.position.y - cone.position.y;
                        var dz = state.position.z - cone.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 2.5) {
                            cone.userData.visited = true;
                            cone.material.opacity = 0.2;
                            this._visitedCount++;
                        }
                    }
                    // 귀환 체크
                    if (this._visitedCount >= 4) {
                        var homeDist = Math.sqrt(
                            state.position.x * state.position.x +
                            state.position.z * state.position.z
                        );
                        if (homeDist < 3) {
                            this._returnedHome = true;
                        }
                    }
                },
                objectives: [
                    {
                        description: '정찰 포인트 2개 방문',
                        check: function (s, t, m) { return m._visitedCount >= 2; }
                    },
                    {
                        description: '모든 정찰 포인트 방문',
                        check: function (s, t, m) { return m._visitedCount >= 4; }
                    },
                    {
                        description: '출발 지점으로 귀환!',
                        check: function (s, t, m) { return m._returnedHome; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 9: 긴급 착륙
            {
                name: '긴급 착륙',
                description: '가장 가까운 착륙 패드를 찾아 안전하게 착륙하세요!',
                timeLimit: 60,
                collectibles: [],
                _landedCorrectly: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._landedCorrectly = false;
                    // 여러 착륙 패드
                    var pads = [
                        { x: 25, z: 25, color: 0xff4444 },
                        { x: -25, z: 25, color: 0x44ff44 },
                        { x: 25, z: -25, color: 0x4444ff },
                        { x: -25, z: -25, color: 0xffff44 }
                    ];
                    var self = this;
                    pads.forEach(function (pad) {
                        var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 32);
                        var padMat = new THREE.MeshPhongMaterial({ color: pad.color });
                        var mesh = new THREE.Mesh(padGeo, padMat);
                        mesh.position.set(pad.x, 0.05, pad.z);
                        mesh.userData.isPad = true;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._landedCorrectly) return;
                    if (!state.isFlying && state.altitude < 0.3) {
                        var self = this;
                        this.collectibles.forEach(function (pad) {
                            if (!pad.userData.isPad) return;
                            var dx = state.position.x - pad.position.x;
                            var dz = state.position.z - pad.position.z;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < 2.5) {
                                self._landedCorrectly = true;
                            }
                        });
                    }
                },
                objectives: [
                    {
                        description: '15m 높이까지 이륙',
                        check: function (state) { return state.altitude > 15; }
                    },
                    {
                        description: '착륙 패드 찾기',
                        _foundPad: false,
                        check: function (state, t, mission) {
                            for (var i = 0; i < mission.collectibles.length; i++) {
                                var pad = mission.collectibles[i];
                                if (!pad.userData.isPad) continue;
                                var dx = state.position.x - pad.position.x;
                                var dz = state.position.z - pad.position.z;
                                var dist = Math.sqrt(dx * dx + dz * dz);
                                if (dist < 5 && state.altitude < 10) {
                                    this._foundPad = true;
                                    return true;
                                }
                            }
                            return false;
                        }
                    },
                    {
                        description: '착륙 패드에 안전하게 착륙!',
                        check: function (s, t, m) { return m._landedCorrectly; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 40; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 10: 자율비행 과제
            {
                name: '자율비행 과제',
                description: '복잡한 코스를 완주하세요! 모든 기술을 활용해야 합니다.',
                timeLimit: 150,
                collectibles: [],
                _checkpointsPassed: 0,
                _ringsPass: 0,
                _landed: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._checkpointsPassed = 0;
                    this._ringsPassed = 0;
                    this._landed = false;

                    // 체크포인트
                    var checkpoints = [
                        { x: 10, y: 5, z: 0, color: 0xff4444 },
                        { x: 15, y: 10, z: 10, color: 0x44ff44 },
                        { x: 0, y: 12, z: 20, color: 0x4444ff }
                    ];
                    var self = this;
                    checkpoints.forEach(function (cp, i) {
                        var geo = new THREE.SphereGeometry(0.6, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: cp.color,
                            transparent: true,
                            opacity: 0.8
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(cp.x, cp.y, cp.z);
                        marker.userData.passed = false;
                        marker.userData.isCheckpoint = true;
                        scene.add(marker);
                        self.collectibles.push(marker);
                    });

                    // 링
                    var rings = [
                        { x: -10, y: 8, z: 20, ry: Math.PI / 2 },
                        { x: -15, y: 6, z: 10, ry: 0 }
                    ];
                    rings.forEach(function (ring) {
                        var geo = new THREE.TorusGeometry(1.8, 0.15, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff00ff,
                            transparent: true,
                            opacity: 0.7
                        });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(ring.x, ring.y, ring.z);
                        mesh.rotation.y = ring.ry;
                        mesh.userData.passed = false;
                        mesh.userData.isRing = true;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });

                    // 최종 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(3, 3, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(-5, 0.05, 0);
                    pad.userData.isLandingPad = true;
                    scene.add(pad);
                    this.collectibles.push(pad);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        if (obj.userData.isCheckpoint && !obj.userData.passed) {
                            var dx = state.position.x - obj.position.x;
                            var dy = state.position.y - obj.position.y;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2) {
                                obj.userData.passed = true;
                                obj.material.opacity = 0.2;
                                self._checkpointsPassed++;
                            }
                        }
                        if (obj.userData.isRing && !obj.userData.passed) {
                            var dx = state.position.x - obj.position.x;
                            var dy = state.position.y - obj.position.y;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2.5) {
                                obj.userData.passed = true;
                                obj.material.opacity = 0.2;
                                self._ringsPassed++;
                            }
                        }
                        if (obj.userData.isLandingPad && !self._landed) {
                            var dx = state.position.x - obj.position.x;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (!state.isFlying && state.altitude < 0.3 && dist < 3) {
                                self._landed = true;
                            }
                        }
                    });
                },
                objectives: [
                    {
                        description: '모든 체크포인트 통과 (3개)',
                        check: function (s, t, m) { return m._checkpointsPassed >= 3; }
                    },
                    {
                        description: '모든 링 통과 (2개)',
                        check: function (s, t, m) { return m._ringsPassed >= 2; }
                    },
                    {
                        description: '골든 착륙 패드에 착륙!',
                        check: function (s, t, m) { return m._landed; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 90; },
                    threeStar: function (time) { return time < 60; }
                }
            },

            // 미션 11: 슬랄롬 비행
            {
                name: '슬랄롬 비행',
                description: '좌우로 배치된 기둥 사이를 지그재그로 통과하세요!',
                timeLimit: 90,
                collectibles: [],
                _passedGates: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passedGates = 0;
                    var gates = [
                        { x: 5, y: 3, z: 5 },
                        { x: -5, y: 3, z: 15 },
                        { x: 5, y: 3, z: 25 },
                        { x: -5, y: 3, z: 35 },
                        { x: 5, y: 3, z: 45 },
                        { x: -5, y: 3, z: 55 }
                    ];
                    var self = this;
                    gates.forEach(function (gate, i) {
                        var geo = new THREE.TorusGeometry(1.2, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0x00ffaa,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.4
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(gate.x, gate.y, gate.z);
                        ring.rotation.x = Math.PI / 2;
                        ring.userData.passed = false;
                        scene.add(ring);
                        self.collectibles.push(ring);

                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, gate.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: 0x00ffaa });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(gate.x, gate.y / 2, gate.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._passedGates >= 6) return;
                    var gate = this.collectibles[this._passedGates * 2];
                    var dx = state.position.x - gate.position.x;
                    var dy = state.position.y - gate.position.y;
                    var dz = state.position.z - gate.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 4) {
                        gate.userData.passed = true;
                        gate.material.opacity = 0.1;
                        this._passedGates++;
                        if (this._passedGates < 6) {
                            this.collectibles[this._passedGates * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '게이트 1, 2 통과',
                        check: function (s, t, m) { return m._passedGates >= 2; }
                    },
                    {
                        description: '게이트 3, 4 통과',
                        check: function (s, t, m) { return m._passedGates >= 4; }
                    },
                    {
                        description: '모든 게이트 통과 완료!',
                        check: function (s, t, m) { return m._passedGates >= 6; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 55; },
                    threeStar: function (time) { return time < 40; }
                }
            },

            // 미션 12: 화물 운송
            {
                name: '화물 운송',
                description: '3개 배달 지점에 순서대로 물건을 배달하세요. 각 지점에서 3초 호버링!',
                timeLimit: 120,
                collectibles: [],
                _currentDelivery: 0,
                _hoverStartTime: null,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentDelivery = 0;
                    this._hoverStartTime = null;
                    var deliveryPoints = [
                        { x: 20, y: 3, z: 0, color: 0xff4444 },
                        { x: 0, y: 3, z: 20, color: 0x44ff44 },
                        { x: -20, y: 3, z: 0, color: 0x4444ff }
                    ];
                    var self = this;
                    deliveryPoints.forEach(function (point, i) {
                        var geo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
                        var mat = new THREE.MeshPhongMaterial({
                            color: point.color,
                            transparent: true,
                            opacity: i === 0 ? 0.8 : 0.3
                        });
                        var pad = new THREE.Mesh(geo, mat);
                        pad.position.set(point.x, point.y, point.z);
                        pad.userData.delivered = false;
                        scene.add(pad);
                        self.collectibles.push(pad);

                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, point.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: point.color });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(point.x, point.y / 2, point.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state, time) {
                    if (this._currentDelivery >= 3) return;
                    var pad = this.collectibles[this._currentDelivery * 2];
                    var dx = state.position.x - pad.position.x;
                    var dy = state.position.y - pad.position.y;
                    var dz = state.position.z - pad.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < 3) {
                        if (!this._hoverStartTime) {
                            this._hoverStartTime = time;
                        } else if (time - this._hoverStartTime > 3) {
                            pad.userData.delivered = true;
                            pad.material.opacity = 0.15;
                            this._currentDelivery++;
                            this._hoverStartTime = null;
                            if (this._currentDelivery < 3) {
                                this.collectibles[this._currentDelivery * 2].material.opacity = 0.8;
                            }
                        }
                    } else {
                        this._hoverStartTime = null;
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 배달 지점 완료',
                        check: function (s, t, m) { return m._currentDelivery >= 1; }
                    },
                    {
                        description: '두 번째 배달 지점 완료',
                        check: function (s, t, m) { return m._currentDelivery >= 2; }
                    },
                    {
                        description: '모든 배달 완료!',
                        check: function (s, t, m) { return m._currentDelivery >= 3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 80; },
                    threeStar: function (time) { return time < 55; }
                }
            },

            // 미션 13: 고도 계단
            {
                name: '고도 계단',
                description: '계단처럼 높이를 올리며 전진하세요!',
                timeLimit: 120,
                collectibles: [],
                _reachedCheckpoints: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedCheckpoints = 0;
                    var checkpoints = [
                        { x: 10, y: 3, z: 0, color: 0xff0000 },
                        { x: 20, y: 6, z: 0, color: 0xff8800 },
                        { x: 30, y: 9, z: 0, color: 0xffff00 },
                        { x: 40, y: 12, z: 0, color: 0x00ff00 },
                        { x: 50, y: 15, z: 0, color: 0x0088ff }
                    ];
                    var self = this;
                    checkpoints.forEach(function (cp, i) {
                        var geo = new THREE.SphereGeometry(0.5, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: cp.color,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(cp.x, cp.y, cp.z);
                        marker.userData.reached = false;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, cp.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: cp.color });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(cp.x, cp.y / 2, cp.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._reachedCheckpoints >= 5) return;
                    var marker = this.collectibles[this._reachedCheckpoints * 2];
                    var dx = state.position.x - marker.position.x;
                    var dy = state.position.y - marker.position.y;
                    var dz = state.position.z - marker.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 4) {
                        marker.userData.reached = true;
                        marker.material.opacity = 0.1;
                        this._reachedCheckpoints++;
                        if (this._reachedCheckpoints < 5) {
                            this.collectibles[this._reachedCheckpoints * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '1, 2단계 도달',
                        check: function (s, t, m) { return m._reachedCheckpoints >= 2; }
                    },
                    {
                        description: '3, 4단계 도달',
                        check: function (s, t, m) { return m._reachedCheckpoints >= 4; }
                    },
                    {
                        description: '최고점 도달!',
                        check: function (s, t, m) { return m._reachedCheckpoints >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 75; },
                    threeStar: function (time) { return time < 50; }
                }
            },

            // 미션 14: 구조 미션
            {
                name: '구조 미션',
                description: '3개 조난자 위치를 찾아 방문 후 베이스로 복귀하세요!',
                timeLimit: 120,
                collectibles: [],
                _rescued: 0,
                _returnedToBase: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._rescued = 0;
                    this._returnedToBase = false;
                    var victims = [
                        { x: 25, y: 3, z: 10, color: 0xff0000 },
                        { x: -15, y: 3, z: 30, color: 0xff8800 },
                        { x: 10, y: 3, z: -20, color: 0xffff00 }
                    ];
                    var self = this;
                    victims.forEach(function (victim) {
                        var geo = new THREE.ConeGeometry(0.5, 1.5, 8);
                        var mat = new THREE.MeshBasicMaterial({
                            color: victim.color,
                            transparent: true,
                            opacity: 0.9
                        });
                        var cone = new THREE.Mesh(geo, mat);
                        cone.position.set(victim.x, victim.y, victim.z);
                        cone.userData.rescued = false;
                        scene.add(cone);
                        self.collectibles.push(cone);

                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, victim.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: victim.color });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(victim.x, victim.y / 2, victim.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });

                    // 베이스 (0, 3, 0)
                    var baseGeo = new THREE.CylinderGeometry(2, 2, 0.2, 32);
                    var baseMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                    var base = new THREE.Mesh(baseGeo, baseMat);
                    base.position.set(0, 3, 0);
                    base.userData.isBase = true;
                    scene.add(base);
                    this.collectibles.push(base);

                    var basePoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
                    var basePoleMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                    var basePole = new THREE.Mesh(basePoleGeo, basePoleMat);
                    basePole.position.set(0, 1.5, 0);
                    scene.add(basePole);
                    this.collectibles.push(basePole);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    // 조난자 체크 (첫 3개 collectibles의 짝수 인덱스)
                    for (var i = 0; i < 3; i++) {
                        var cone = this.collectibles[i * 2];
                        if (cone.userData.rescued) continue;
                        var dx = state.position.x - cone.position.x;
                        var dy = state.position.y - cone.position.y;
                        var dz = state.position.z - cone.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 3) {
                            cone.userData.rescued = true;
                            cone.material.opacity = 0.2;
                            this._rescued++;
                        }
                    }

                    // 베이스 복귀 체크
                    if (this._rescued >= 3) {
                        var baseDist = Math.sqrt(
                            state.position.x * state.position.x +
                            (state.position.y - 3) * (state.position.y - 3) +
                            state.position.z * state.position.z
                        );
                        if (baseDist < 3) {
                            this._returnedToBase = true;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 조난자 구조',
                        check: function (s, t, m) { return m._rescued >= 1; }
                    },
                    {
                        description: '모든 조난자 구조 완료',
                        check: function (s, t, m) { return m._rescued >= 3; }
                    },
                    {
                        description: '베이스로 귀환!',
                        check: function (s, t, m) { return m._returnedToBase; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 80; },
                    threeStar: function (time) { return time < 55; }
                }
            },

            // 미션 15: 마스터 챌린지
            {
                name: '마스터 챌린지',
                description: '종합 과제 - 이륙, 링통과, 정밀착륙, 고속비행을 모두 수행하세요!',
                timeLimit: 150,
                collectibles: [],
                _reachedHighAltitude: false,
                _passedRing: false,
                _reachedPrecisionPoint: false,
                _landed: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedHighAltitude = false;
                    this._passedRing = false;
                    this._reachedPrecisionPoint = false;
                    this._landed = false;

                    // 링 (20, 8, 0)
                    var ringGeo = new THREE.TorusGeometry(2, 0.15, 8, 24);
                    var ringMat = new THREE.MeshBasicMaterial({
                        color: 0xff00ff,
                        transparent: true,
                        opacity: 0.8
                    });
                    var ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(20, 8, 0);
                    ring.rotation.y = Math.PI / 2;
                    scene.add(ring);
                    this.collectibles.push(ring);

                    // 정밀 지점 (30, 3, 30)
                    var precisionGeo = new THREE.SphereGeometry(0.5, 16, 16);
                    var precisionMat = new THREE.MeshBasicMaterial({
                        color: 0xffff00,
                        transparent: true,
                        opacity: 0.9
                    });
                    var precisionMarker = new THREE.Mesh(precisionGeo, precisionMat);
                    precisionMarker.position.set(30, 3, 30);
                    scene.add(precisionMarker);
                    this.collectibles.push(precisionMarker);

                    var precisionPoleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
                    var precisionPoleMat = new THREE.MeshPhongMaterial({ color: 0xffff00 });
                    var precisionPole = new THREE.Mesh(precisionPoleGeo, precisionPoleMat);
                    precisionPole.position.set(30, 1.5, 30);
                    scene.add(precisionPole);
                    this.collectibles.push(precisionPole);

                    // 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(0, 0.05, 0);
                    scene.add(pad);
                    this.collectibles.push(pad);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    // 고도 8m 체크
                    if (!this._reachedHighAltitude && state.altitude > 8) {
                        this._reachedHighAltitude = true;
                    }

                    // 링 통과 체크 (20, 8, 0)
                    if (!this._passedRing) {
                        var ringDist = Math.sqrt(
                            (state.position.x - 20) * (state.position.x - 20) +
                            (state.position.y - 8) * (state.position.y - 8) +
                            state.position.z * state.position.z
                        );
                        if (ringDist < 5) {
                            this._passedRing = true;
                            this.collectibles[0].material.opacity = 0.2;
                        }
                    }

                    // 정밀 지점 체크 (30, 3, 30)
                    if (!this._reachedPrecisionPoint) {
                        var precisionDist = Math.sqrt(
                            (state.position.x - 30) * (state.position.x - 30) +
                            (state.position.y - 3) * (state.position.y - 3) +
                            (state.position.z - 30) * (state.position.z - 30)
                        );
                        if (precisionDist < 3) {
                            this._reachedPrecisionPoint = true;
                            this.collectibles[1].material.opacity = 0.2;
                        }
                    }

                    // 착륙 체크
                    if (!this._landed && !state.isFlying && state.altitude < 0.5) {
                        var padDist = Math.sqrt(
                            state.position.x * state.position.x +
                            state.position.z * state.position.z
                        );
                        if (padDist < 2.5) {
                            this._landed = true;
                        }
                    }
                },
                objectives: [
                    {
                        description: '고도 8m 도달',
                        check: function (s, t, m) { return m._reachedHighAltitude; }
                    },
                    {
                        description: '링 통과 (20, 8, 0)',
                        check: function (s, t, m) { return m._passedRing; }
                    },
                    {
                        description: '정밀 지점 도달 (30, 3, 30)',
                        check: function (s, t, m) { return m._reachedPrecisionPoint; }
                    },
                    {
                        description: '착륙 패드에 안전하게 착륙!',
                        check: function (s, t, m) { return m._landed; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 100; },
                    threeStar: function (time) { return time < 70; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createHighMissions = createHighMissions;
})();
