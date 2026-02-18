/**
 * 저학년 드론 시뮬레이터 앱
 * Three.js 씬 구성, 게임 루프, 미션 시스템 통합
 */
(function () {
    'use strict';

    var scene, renderer, camera;
    var physics, droneModel, world, cameraSystem;
    var hud, messageDisplay, minimap, controls;
    var missionManager, missionUI;
    var windPanel;
    var tuningPanel;
    var clock;
    var isStarted = false;
    var currentMissionDef = null;
    var initError = null;

    // 모듈을 안전하게 가져오기
    var DS = window.DroneSim || {};
    var DronePhysics = DS.DronePhysics;
    var DroneModel = DS.DroneModel;
    var World = DS.World;
    var CameraSystem = DS.CameraSystem;
    var HUD = DS.HUD;
    var MessageDisplay = DS.MessageDisplay;
    var Minimap = DS.Minimap;
    var SimpleControls = DS.SimpleControls;
    var MissionManager = DS.MissionManager;
    var MissionSelectUI = DS.MissionSelectUI;
    var createLowMissions = DS.createLowMissions;
    var WindPresets = DS.WindPresets;
    var WindSettingsPanel = DS.WindSettingsPanel;
    var PhysicsTuningPanel = DS.PhysicsTuningPanel;

    /**
     * 시뮬레이션 시작 (오버레이 숨기기)
     */
    function startSimulation() {
        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.style.display = 'none';
        isStarted = true;
        window._droneStarted = true;
        if (messageDisplay) {
            messageDisplay.show('이륙 버튼을 눌러보세요!', 'info', 3000);
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
        // 시작 버튼 한 번 더 확인 (혹시 위에서 실패했을 경우)
        attachStartButton();

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
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
            maxSpeed: 8, speedLimit: 8,
            autoStabilize: true, stabilizeRate: 5.0,
            maxTiltAngle: Math.PI / 8, batteryDrainRate: 0.3, dragCoefficient: 0.5
        });

        physics.onCollision = function (speed) {
            if (messageDisplay) messageDisplay.show('쿵! 조심해요!', 'warning', 1500);
        };
        physics.onLanded = function () {
            if (!missionManager || !missionManager.isRunning) {
                if (messageDisplay) messageDisplay.show('착륙 성공!', 'success', 2000);
            }
        };

        droneModel = new DroneModel();
        scene.add(droneModel.getModel());

        cameraSystem = new CameraSystem(camera);
        cameraSystem.setTarget(droneModel.getModel());

        hud = new HUD();
        messageDisplay = new MessageDisplay();
        minimap = new Minimap(null, 60);
        controls = new SimpleControls(physics);

        // 바람 시스템
        if (WindSettingsPanel && WindPresets) {
            windPanel = new WindSettingsPanel();
            windPanel.onPresetChange = function (preset) {
                var windProfile = WindPresets[preset] ? WindPresets[preset]() : null;
                physics.setWind(windProfile);
                if (messageDisplay) {
                    var names = { calm: '바람 없음', light: '약풍', moderate: '중풍', strong: '강풍', gusty: '돌풍', sinusoid: '변동풍' };
                    messageDisplay.show('바람: ' + (names[preset] || preset), 'info', 1500);
                }
            };
        }

        // 튜닝 패널
        if (PhysicsTuningPanel) {
            tuningPanel = new PhysicsTuningPanel(physics);
        }

        // 미션 시스템
        initMissions();

        window.addEventListener('resize', onResize);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'v' || e.key === 'V') {
                if (windPanel) windPanel.toggle();
            }
            if (e.key === 'b' || e.key === 'B') {
                if (tuningPanel) tuningPanel.toggle();
            }
        });
    }

    function initMissions() {
        if (!MissionManager || !createLowMissions || !MissionSelectUI) return;

        missionManager = new MissionManager('drone-low-progress');
        var missions = createLowMissions();
        missions.forEach(function (m) { missionManager.addMission(m); });

        missionManager.onMissionStart = function (mission) {
            currentMissionDef = mission;
            var origMission = missions[mission.index];
            if (origMission.setup) origMission.setup(scene);
            currentMissionDef._origMission = origMission;

            physics.reset();
            if (messageDisplay) messageDisplay.show(mission.name + ' 시작!', 'info', 2000);
            missionUI.showMissionHUD(mission);
        };

        missionManager.onMissionComplete = function (result) {
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
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

        // 미션 버튼 추가
        var missionBtn = document.createElement('button');
        missionBtn.id = 'btn-mission';
        missionBtn.textContent = '미션';
        missionBtn.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:50;padding:8px 24px;border-radius:20px;border:1px solid rgba(68,255,136,0.4);background:rgba(68,255,136,0.15);color:#44ff88;font-size:14px;font-weight:bold;cursor:pointer;font-family:inherit;';
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
        physics.reset();
        missionUI.show();
    }

    function startMission(index) {
        if (!missionManager) return;
        if (index >= missionManager.missions.length) {
            if (messageDisplay) messageDisplay.show('모든 미션을 완료했어요!', 'success', 3000);
            return;
        }
        if (!missionManager.isMissionUnlocked(index)) {
            if (messageDisplay) messageDisplay.show('이전 미션을 먼저 완료하세요!', 'warning', 2000);
            return;
        }
        physics.reset();
        physics.takeoff(2);
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
                    currentMissionDef._origMission.frameUpdate(state, missionManager.missionTime, dt);
                    // frameUpdate 후 미션 상태 동기화 (origMission → currentMission)
                    // startMission의 shallow copy로 인해 원본 상태가 복사본에 반영 안 되는 문제 해결
                    var origM_ = currentMissionDef._origMission;
                    for (var k in origM_) {
                        if ((k.charAt(0) === '_' || k === 'collectibles') && origM_.hasOwnProperty(k)) {
                            currentMissionDef[k] = origM_[k];
                        }
                    }
                }
                missionManager.update(dt, state);
                if (missionUI) missionUI.updateMissionHUD(currentMissionDef, missionManager.missionTime);
            }

            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
            if (dist > 45 && hud) {
                hud.showWarning('너무 멀어요! 돌아오세요!');
            }
        }

        renderer.render(scene, camera);
    }

    try {
        init();
        animate();
    } catch (e) {
        initError = e;
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-size:16px;font-family:monospace;white-space:pre-wrap;';
        d.textContent = 'INIT ERROR: ' + e.message + '\n' + e.stack;
        document.body.appendChild(d);
    }
})();
