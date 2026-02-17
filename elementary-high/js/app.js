/**
 * 고학년 드론 시뮬레이터 앱
 * Three.js 씬 구성, 게임 루프, 키보드 조작, 미션 시스템
 */
(function () {
    'use strict';

    // 모듈을 안전하게 가져오기
    var DS = window.DroneSim || {};
    var DronePhysics = DS.DronePhysics;
    var DroneModel = DS.DroneModel;
    var World = DS.World;
    var CameraSystem = DS.CameraSystem;
    var HUD = DS.HUD;
    var MessageDisplay = DS.MessageDisplay;
    var Minimap = DS.Minimap;
    var KeyboardControls = DS.KeyboardControls;
    var MissionManager = DS.MissionManager;
    var MissionSelectUI = DS.MissionSelectUI;
    var createHighMissions = DS.createHighMissions;
    var PathOverlay = DS.PathOverlay;
    var Autopilot = DS.Autopilot;

    var scene, renderer, camera;
    var physics, droneModel, world, cameraSystem;
    var hud, messageDisplay, minimap, controls, pathOverlay;
    var missionManager, missionUI;
    var autopilot;
    var clock;
    var isStarted = false;
    var currentMissionDef = null;

    /**
     * 시뮬레이션 시작 (오버레이 숨기기)
     */
    function startSimulation() {
        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.style.display = 'none';
        isStarted = true;
        window._droneStarted = true;
        if (messageDisplay) {
            messageDisplay.show('T: 이륙 | M: 미션 | H: 키 안내', 'info', 4000);
        }
    }

    // 시작 버튼 이벤트 - 가능한 한 빨리 등록
    function attachStartButton() {
        var btn = document.getElementById('btn-start');
        if (btn) {
            btn.addEventListener('click', startSimulation);
            btn.addEventListener('touchend', function (e) {
                e.preventDefault();
                startSimulation();
            });
        }
    }

    // DOM 로드 후 즉시 시작 버튼 연결
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachStartButton);
    } else {
        attachStartButton();
    }

    function init() {
        attachStartButton();

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x87ceeb, 100, 250);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 5, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x87ceeb);
        if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        clock = new THREE.Clock();

        world = new World(scene);
        world.create();

        physics = new DronePhysics({
            maxSpeed: 15, speedLimit: 15,
            autoStabilize: true, stabilizeRate: 3.0,
            maxTiltAngle: Math.PI / 5, batteryDrainRate: 0.5, dragCoefficient: 0.3
        });

        physics.onCollision = function (speed) {
            if (!messageDisplay) return;
            if (speed > 5) messageDisplay.show('강한 충돌! 주의하세요!', 'error', 2000);
            else messageDisplay.show('가벼운 충돌', 'warning', 1000);
        };
        physics.onLanded = function () {
            if (missionManager && missionManager.isRunning) return;
            if (!messageDisplay) return;
            var state = physics.getState();
            var distFromPad = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
            if (distFromPad < 1.5) messageDisplay.show('착륙 패드에 정확히 착륙!', 'success', 2500);
            else messageDisplay.show('착륙 완료', 'info', 1500);
        };

        droneModel = new DroneModel();
        scene.add(droneModel.getModel());

        cameraSystem = new CameraSystem(camera);
        cameraSystem.setTarget(droneModel.getModel());

        hud = new HUD();
        messageDisplay = new MessageDisplay();
        minimap = new Minimap(null, 70);

        // 경로 오버레이 + 자율비행 시스템
        if (PathOverlay) pathOverlay = new PathOverlay();
        if (Autopilot) autopilot = new Autopilot(physics);

        controls = new KeyboardControls(physics);
        controls.onCameraSwitch = function () {
            cameraSystem.nextMode();
            if (hud) hud.setCameraMode(cameraSystem.getModeName());
            if (messageDisplay) messageDisplay.show('카메라: ' + cameraSystem.getModeName(), 'info', 1000);
        };

        // 미션 시스템
        initMissions();

        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !isStarted) startSimulation();
            if (e.key === 'm' || e.key === 'M') {
                if (isStarted) showMissionSelect();
            }
            if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (pathOverlay) pathOverlay.toggle();
            }
        });
    }

    function initMissions() {
        if (!MissionManager || !createHighMissions || !MissionSelectUI) return;

        missionManager = new MissionManager('drone-high-progress');
        var missions = createHighMissions();
        missions.forEach(function (m) { missionManager.addMission(m); });

        missionManager.onMissionStart = function (mission) {
            currentMissionDef = mission;
            var origMission = missions[mission.index];
            if (origMission.setup) origMission.setup(scene);
            currentMissionDef._origMission = origMission;

            physics.reset();
            if (messageDisplay) messageDisplay.show(mission.name + ' 시작!', 'info', 2000);
            missionUI.showMissionHUD(mission);

            // 경로 정보 추출 및 설정
            setupPathForMission(origMission);
        };

        missionManager.onMissionComplete = function (result) {
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
            clearPathInfo();
            missionUI.hideMissionHUD();
            missionUI.showResult(result,
                function () { startMission(result.mission.index); },
                function () { startMission(result.mission.index + 1); },
                function () { showMissionSelect(); }
            );
        };

        missionManager.onMissionFail = function (result) {
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
            clearPathInfo();
            missionUI.hideMissionHUD();
            missionUI.showResult(result,
                function () { startMission(result.mission.index); },
                null,
                function () { showMissionSelect(); }
            );
        };

        missionManager.onObjectiveUpdate = function (obj) {
            if (messageDisplay) messageDisplay.show(obj.description + ' 완료!', 'success', 1500);
        };

        missionUI = new MissionSelectUI(missionManager,
            function (idx) { startMission(idx); },
            function () { /* 자유비행 복귀 */ }
        );

        // 미션 버튼 + M키 안내
        var missionBtn = document.createElement('button');
        missionBtn.id = 'btn-mission';
        missionBtn.textContent = '미션 (M)';
        missionBtn.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:50;padding:8px 24px;border-radius:20px;border:1px solid rgba(74,158,255,0.4);background:rgba(74,158,255,0.15);color:#4a9eff;font-size:14px;font-weight:bold;cursor:pointer;font-family:inherit;';
        missionBtn.addEventListener('click', function () { showMissionSelect(); });
        document.body.appendChild(missionBtn);
    }

    function showMissionSelect() {
        if (!missionManager || !missionUI) return;
        if (missionManager.isRunning) {
            missionManager.stopMission();
            missionUI.hideMissionHUD();
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
        }
        clearPathInfo();
        physics.reset();
        missionUI.show();
    }

    /**
     * 미션에서 웨이포인트를 추출하고 경로 정보를 설정
     */
    function setupPathForMission(origMission) {
        // 미션의 setup 함수 내 targets 배열을 추출하기 위해
        // collectibles에서 좌표 추출 (짝수 인덱스가 타겟 구체)
        var waypoints = [];
        if (origMission.collectibles && origMission.collectibles.length > 0) {
            for (var i = 0; i < origMission.collectibles.length; i += 2) {
                var obj = origMission.collectibles[i];
                if (obj && obj.position) {
                    waypoints.push({
                        x: obj.position.x,
                        y: obj.position.y,
                        z: obj.position.z
                    });
                }
            }
        }

        // 웨이포인트가 있는 미션에서만 경로 정보 표시
        if (waypoints.length > 1) {
            // 물리 기반 시간 추정
            var estimate = { totalTime: 0, segmentTimes: [] };
            if (autopilot) {
                estimate = autopilot.estimatePathTime(waypoints);
            }

            // 미니맵에 경로 표시
            if (minimap) {
                minimap.setWaypoints(waypoints);
                minimap.setCurrentWaypointIndex(0);
            }

            // PathOverlay에 경로 정보 설정
            if (pathOverlay) {
                pathOverlay.setPath(waypoints, estimate.segmentTimes, estimate.totalTime);
                pathOverlay.show();
            }

            // 미션에 경로 정보 저장 (프레임 업데이트용)
            currentMissionDef._pathWaypoints = waypoints;
            currentMissionDef._pathEstimate = estimate;
        }
    }

    /**
     * 경로 정보 초기화
     */
    function clearPathInfo() {
        if (minimap) minimap.clearWaypoints();
        if (pathOverlay) {
            pathOverlay.clear();
            pathOverlay.hide();
        }
    }

    function startMission(index) {
        if (!missionManager) return;
        if (index >= missionManager.missions.length) {
            if (messageDisplay) messageDisplay.show('모든 미션을 완료했습니다!', 'success', 3000);
            return;
        }
        if (!missionManager.isMissionUnlocked(index)) {
            if (messageDisplay) messageDisplay.show('이전 미션을 먼저 완료하세요!', 'warning', 2000);
            return;
        }
        physics.reset();
        physics.takeoff(3);
        missionManager.startMission(index);
    }

    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        // inline onclick 백업에서 시작된 경우도 감지
        if (window._droneStarted && !isStarted) {
            isStarted = true;
        }

        if (!clock || !renderer) return;
        var dt = Math.min(clock.getDelta(), 0.05);

        if (isStarted && controls && physics) {
            var input = controls.getInput();

            var state = physics.update(dt, input);
            if (droneModel) {
                droneModel.updateFromPhysics(state);
                droneModel.updatePropellers(dt, input.throttle);
            }
            if (cameraSystem) cameraSystem.update(dt);
            if (hud) hud.update(state);
            if (minimap) minimap.update(state);

            // 미션 업데이트
            if (missionManager && missionManager.isRunning && currentMissionDef) {
                if (currentMissionDef._origMission && currentMissionDef._origMission.frameUpdate) {
                    currentMissionDef._origMission.frameUpdate(state, physics, dt);
                }
                missionManager.update(dt, state);
                if (missionUI) missionUI.updateMissionHUD(currentMissionDef, missionManager.missionTime);

                // 경로 진행 상황 업데이트
                if (currentMissionDef._pathWaypoints && currentMissionDef._origMission) {
                    var wpIdx = currentMissionDef._origMission._currentTarget || 0;
                    var wps = currentMissionDef._pathWaypoints;

                    // 미니맵 현재 웨이포인트 인덱스 업데이트
                    if (minimap) minimap.setCurrentWaypointIndex(wpIdx);

                    // 다음 웨이포인트까지 거리
                    var distToNext = 0;
                    if (wpIdx < wps.length) {
                        var dx = wps[wpIdx].x - state.position.x;
                        var dy = wps[wpIdx].y - state.position.y;
                        var dz = wps[wpIdx].z - state.position.z;
                        distToNext = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    }

                    // 남은 예상 시간
                    var remTime = 0;
                    if (currentMissionDef._pathEstimate && currentMissionDef._pathEstimate.segmentTimes) {
                        var segTimes = currentMissionDef._pathEstimate.segmentTimes;
                        for (var si = wpIdx; si < segTimes.length; si++) {
                            remTime += segTimes[si];
                        }
                    }

                    // PathOverlay 업데이트
                    if (pathOverlay) {
                        pathOverlay.updateProgress(wpIdx, distToNext, remTime, state.position);
                    }
                }
            }

            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
            if (dist > 45 && hud) hud.showWarning('비행 경계를 벗어났습니다!');
            if (state.altitude > 45 && hud) hud.showWarning('최대 고도에 가까워지고 있습니다!');
            if (state.battery < 20 && state.battery > 19.5) {
                if (messageDisplay) messageDisplay.show('배터리 부족! 착륙하세요!', 'warning', 2000);
            }
        }

        renderer.render(scene, camera);
    }

    try {
        init();
        animate();
    } catch (e) {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-size:16px;font-family:monospace;white-space:pre-wrap;';
        d.textContent = 'INIT ERROR: ' + e.message + '\n' + e.stack;
        document.body.appendChild(d);
    }
})();
