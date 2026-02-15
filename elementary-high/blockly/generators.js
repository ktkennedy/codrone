/**
 * 드론 블록 → JavaScript 코드 생성기
 * Blockly 블록을 실행 가능한 drone API 호출로 변환합니다.
 */
(function () {
    'use strict';

    // JavaScript 코드 생성기
    var gen = Blockly.JavaScript || (Blockly.JavaScript = new Blockly.Generator('JavaScript'));

    // 기본 동작
    gen.forBlock['drone_takeoff'] = function (block) {
        return 'await drone.takeoff();\n';
    };

    gen.forBlock['drone_land'] = function (block) {
        return 'await drone.land();\n';
    };

    gen.forBlock['drone_hover'] = function (block) {
        var seconds = gen.valueToCode(block, 'SECONDS', gen.ORDER_ATOMIC) || '1';
        return 'await drone.hover(' + seconds + ');\n';
    };

    // 이동
    gen.forBlock['drone_move_forward'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveForward(' + distance + ');\n';
    };

    gen.forBlock['drone_move_backward'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveBackward(' + distance + ');\n';
    };

    gen.forBlock['drone_move_left'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveLeft(' + distance + ');\n';
    };

    gen.forBlock['drone_move_right'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveRight(' + distance + ');\n';
    };

    gen.forBlock['drone_move_up'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveUp(' + distance + ');\n';
    };

    gen.forBlock['drone_move_down'] = function (block) {
        var distance = gen.valueToCode(block, 'DISTANCE', gen.ORDER_ATOMIC) || '1';
        return 'await drone.moveDown(' + distance + ');\n';
    };

    // 회전
    gen.forBlock['drone_turn_left'] = function (block) {
        var angle = gen.valueToCode(block, 'ANGLE', gen.ORDER_ATOMIC) || '90';
        return 'await drone.turnLeft(' + angle + ');\n';
    };

    gen.forBlock['drone_turn_right'] = function (block) {
        var angle = gen.valueToCode(block, 'ANGLE', gen.ORDER_ATOMIC) || '90';
        return 'await drone.turnRight(' + angle + ');\n';
    };

    // 대기
    gen.forBlock['drone_wait'] = function (block) {
        var seconds = gen.valueToCode(block, 'SECONDS', gen.ORDER_ATOMIC) || '1';
        return 'await drone.wait(' + seconds + ');\n';
    };

    // 센서
    gen.forBlock['drone_get_altitude'] = function (block) {
        return ['drone.getAltitude()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_speed'] = function (block) {
        return ['drone.getSpeed()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_battery'] = function (block) {
        return ['drone.getBattery()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_front_distance'] = function (block) {
        return ['drone.getFrontDistance()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_ground_color'] = function (block) {
        return ["drone.getGroundColor()", gen.ORDER_FUNCTION_CALL];
    };

    // ===== 자율비행 =====

    gen.forBlock['drone_fly_to'] = function (block) {
        var x = gen.valueToCode(block, 'X', gen.ORDER_ATOMIC) || '0';
        var y = gen.valueToCode(block, 'Y', gen.ORDER_ATOMIC) || '3';
        var z = gen.valueToCode(block, 'Z', gen.ORDER_ATOMIC) || '0';
        return 'await drone.flyTo(' + x + ', ' + y + ', ' + z + ');\n';
    };

    gen.forBlock['drone_return_home'] = function (block) {
        return 'await drone.returnHome();\n';
    };

    gen.forBlock['drone_follow_path'] = function (block) {
        var waypointCode = gen.statementToCode(block, 'WAYPOINTS');
        var code = '{\n  var _waypoints = [];\n' +
            waypointCode +
            '  await drone.followPath(_waypoints);\n}\n';
        return code;
    };

    gen.forBlock['drone_add_waypoint'] = function (block) {
        var x = gen.valueToCode(block, 'X', gen.ORDER_ATOMIC) || '0';
        var z = gen.valueToCode(block, 'Z', gen.ORDER_ATOMIC) || '0';
        var y = gen.valueToCode(block, 'Y', gen.ORDER_ATOMIC) || '3';
        return '_waypoints.push({x: ' + x + ', y: ' + y + ', z: ' + z + '});\n';
    };

    gen.forBlock['drone_set_speed'] = function (block) {
        var speed = gen.valueToCode(block, 'SPEED', gen.ORDER_ATOMIC) || '3';
        return 'drone.setSpeed(' + speed + ');\n';
    };

    // 자율비행 센서
    gen.forBlock['drone_get_position_x'] = function (block) {
        return ['drone.getPositionX()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_position_z'] = function (block) {
        return ['drone.getPositionZ()', gen.ORDER_FUNCTION_CALL];
    };

    gen.forBlock['drone_get_distance_to'] = function (block) {
        var x = gen.valueToCode(block, 'X', gen.ORDER_ATOMIC) || '0';
        var z = gen.valueToCode(block, 'Z', gen.ORDER_ATOMIC) || '0';
        return ['drone.getDistanceTo(' + x + ', ' + z + ')', gen.ORDER_FUNCTION_CALL];
    };

})();
