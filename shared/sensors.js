/**
 * 드론 센서 시뮬레이션
 * 거리 센서, 색상 센서, 라인 감지 등을 시뮬레이션합니다.
 */
class DroneSensors {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.raycaster = new THREE.Raycaster();
        this._groundColors = {};
        this._obstacleCache = null;
        this._rayOrigin = new THREE.Vector3();
        this._rayDirection = new THREE.Vector3();
    }

    /**
     * 장애물 캐시 가져오기 (첫 호출 시 생성)
     */
    _getObstacles() {
        if (this._obstacleCache === null) {
            this._obstacleCache = [];
            this.scene.traverse(function (child) {
                if (child.isMesh && child.userData.isObstacle) {
                    this._obstacleCache.push(child);
                }
            }.bind(this));
        }
        return this._obstacleCache;
    }

    /**
     * 장애물 캐시 무효화 (동적 장애물용)
     */
    invalidateCache() {
        this._obstacleCache = null;
    }

    /**
     * 전방 거리 센서 (장애물까지 거리)
     */
    getFrontDistance() {
        var pos = this.physics.position;
        var yaw = this.physics.rotation.yaw;

        this._rayOrigin.set(pos.x, pos.y, pos.z);
        this._rayDirection.set(-Math.sin(yaw), 0, -Math.cos(yaw));

        this.raycaster.set(this._rayOrigin, this._rayDirection);
        this.raycaster.far = 50;

        var meshes = this._getObstacles();

        var intersects = this.raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            return Math.round(intersects[0].distance * 10) / 10;
        }
        return 50;
    }

    /**
     * 하방 거리 센서 (지면까지 거리)
     */
    getBottomDistance() {
        return Math.round(this.physics.position.y * 10) / 10;
    }

    /**
     * 바닥 색상 감지
     * 라인 트레이싱용 - 바닥에 그려진 색상을 반환
     */
    getGroundColor() {
        var x = Math.round(this.physics.position.x);
        var z = Math.round(this.physics.position.z);
        var key = x + ',' + z;

        if (this._groundColors[key]) {
            return this._groundColors[key];
        }
        return 'green'; // 기본 잔디색
    }

    /**
     * 라인 감지 (왼쪽/중앙/오른쪽)
     * 라인 트레이싱 AI용
     */
    getLineSensors() {
        var pos = this.physics.position;
        var yaw = this.physics.rotation.yaw;
        var cos = Math.cos(yaw);
        var sin = Math.sin(yaw);

        // 3개 센서 (왼쪽, 중앙, 오른쪽)
        var offsets = [
            { name: 'left', dx: -0.5, dz: -0.3 },
            { name: 'center', dx: 0, dz: -0.5 },
            { name: 'right', dx: 0.5, dz: -0.3 }
        ];

        var results = {};
        var self = this;
        offsets.forEach(function (offset) {
            var wx = pos.x + offset.dx * cos - offset.dz * sin;
            var wz = pos.z + offset.dx * sin + offset.dz * cos;
            var key = Math.round(wx) + ',' + Math.round(wz);
            results[offset.name] = self._groundColors[key] === 'black';
        });

        return results;
    }

    /**
     * 바닥에 컬러 라인 그리기 (미션 셋업용)
     */
    drawLine(points, color) {
        color = color || 'black';
        var self = this;
        for (var i = 0; i < points.length - 1; i++) {
            var p1 = points[i];
            var p2 = points[i + 1];
            var dx = p2.x - p1.x;
            var dz = p2.z - p1.z;
            var length = Math.sqrt(dx * dx + dz * dz);
            var steps = Math.ceil(length);

            for (var s = 0; s <= steps; s++) {
                var t = s / steps;
                var x = Math.round(p1.x + dx * t);
                var z = Math.round(p1.z + dz * t);
                // 라인 폭 (양옆 1칸씩)
                for (var w = -1; w <= 1; w++) {
                    self._groundColors[x + ',' + (z + w)] = color;
                    self._groundColors[(x + w) + ',' + z] = color;
                }
            }
        }

        // 시각적 라인 표시
        var lineColor = color === 'black' ? 0x222222 : color === 'red' ? 0xff0000 : 0x0000ff;
        for (var i = 0; i < points.length - 1; i++) {
            var p1 = points[i];
            var p2 = points[i + 1];
            var dx = p2.x - p1.x;
            var dz = p2.z - p1.z;
            var length = Math.sqrt(dx * dx + dz * dz);
            var angle = Math.atan2(dx, dz);

            var geo = new THREE.PlaneGeometry(1, length);
            var mat = new THREE.MeshBasicMaterial({
                color: lineColor, side: THREE.DoubleSide
            });
            var plane = new THREE.Mesh(geo, mat);
            plane.rotation.x = -Math.PI / 2;
            plane.rotation.z = -angle;
            plane.position.set(
                (p1.x + p2.x) / 2,
                0.02,
                (p1.z + p2.z) / 2
            );
            this.scene.add(plane);
        }
    }

    /**
     * 목표 지점 색상 마커 배치
     */
    placeColorMarker(x, z, color) {
        var key = Math.round(x) + ',' + Math.round(z);
        this._groundColors[key] = color;

        var colorMap = {
            'red': 0xff0000, 'blue': 0x0000ff, 'yellow': 0xffff00,
            'black': 0x222222, 'white': 0xffffff
        };
        var hex = colorMap[color] || 0xff00ff;

        var geo = new THREE.CircleGeometry(1, 16);
        var mat = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide });
        var marker = new THREE.Mesh(geo, mat);
        marker.rotation.x = -Math.PI / 2;
        marker.position.set(x, 0.03, z);
        this.scene.add(marker);
    }

    clearColors() {
        this._groundColors = {};
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.DroneSensors = DroneSensors;
