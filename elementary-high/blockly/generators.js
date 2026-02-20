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

    // ===== Async 함수 생성 =====
    // 드론 명령(await)이 사용자 정의 함수 안에서도 작동하도록
    // Blockly 표준 procedure 생성기를 async function으로 오버라이드

    gen.forBlock['procedures_defnoreturn'] = function (block) {
        var funcName = gen.nameDB_
            ? gen.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE')
            : (block.getFieldValue('NAME') || 'myFunction');
        var branch = gen.statementToCode(block, 'STACK');
        var args = [];
        var vars = block.arguments_ || [];
        for (var i = 0; i < vars.length; i++) {
            args.push(gen.nameDB_
                ? gen.nameDB_.getName(vars[i], 'VARIABLE')
                : vars[i]);
        }
        var code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + branch + '}\n';
        gen.definitions_['%' + funcName] = code;
        return null;
    };

    gen.forBlock['procedures_defreturn'] = function (block) {
        var funcName = gen.nameDB_
            ? gen.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE')
            : (block.getFieldValue('NAME') || 'myFunction');
        var branch = gen.statementToCode(block, 'STACK');
        var returnValue = gen.valueToCode(block, 'RETURN', gen.ORDER_NONE) || '';
        var args = [];
        var vars = block.arguments_ || [];
        for (var i = 0; i < vars.length; i++) {
            args.push(gen.nameDB_
                ? gen.nameDB_.getName(vars[i], 'VARIABLE')
                : vars[i]);
        }
        var code = 'async function ' + funcName + '(' + args.join(', ') + ') {\n' + branch;
        if (returnValue) code += gen.INDENT + 'return ' + returnValue + ';\n';
        code += '}\n';
        gen.definitions_['%' + funcName] = code;
        return null;
    };

    gen.forBlock['procedures_callnoreturn'] = function (block) {
        var funcName = gen.nameDB_
            ? gen.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE')
            : (block.getFieldValue('NAME') || 'myFunction');
        var args = [];
        for (var i = 0; block.getInput && block.getInput('ARG' + i); i++) {
            args.push(gen.valueToCode(block, 'ARG' + i, gen.ORDER_NONE) || 'null');
        }
        return 'await ' + funcName + '(' + args.join(', ') + ');\n';
    };

    gen.forBlock['procedures_callreturn'] = function (block) {
        var funcName = gen.nameDB_
            ? gen.nameDB_.getName(block.getFieldValue('NAME'), 'PROCEDURE')
            : (block.getFieldValue('NAME') || 'myFunction');
        var args = [];
        for (var i = 0; block.getInput && block.getInput('ARG' + i); i++) {
            args.push(gen.valueToCode(block, 'ARG' + i, gen.ORDER_NONE) || 'null');
        }
        return ['await ' + funcName + '(' + args.join(', ') + ')', gen.ORDER_FUNCTION_CALL];
    };

    // ===== 출력 =====
    gen.forBlock['drone_print'] = function (block) {
        var value = gen.valueToCode(block, 'VALUE', gen.ORDER_NONE) || "''";
        return 'console.log(' + value + ');\n';
    };

    gen.forBlock['drone_print_text'] = function (block) {
        var text = block.getFieldValue('TEXT') || '';
        return 'console.log(' + gen.quote_(text) + ');\n';
    };

    // ===== 루프 오버라이드 (async/await 호환) =====
    gen.forBlock['controls_repeat_ext'] = function (block) {
        var repeats = gen.valueToCode(block, 'TIMES', gen.ORDER_ATOMIC) || '0';
        var branch = gen.statementToCode(block, 'DO');
        var loopVar = 'count';
        if (gen.nameDB_) {
            loopVar = gen.nameDB_.getDistinctName('count', 'VARIABLE');
        }
        return 'for (var ' + loopVar + ' = 0; ' + loopVar + ' < ' + repeats + '; ' + loopVar + '++) {\n' + branch + '}\n';
    };

    gen.forBlock['controls_whileUntil'] = function (block) {
        var until = block.getFieldValue('MODE') === 'UNTIL';
        var argument0 = gen.valueToCode(block, 'BOOL', until ? gen.ORDER_LOGICAL_NOT : gen.ORDER_NONE) || 'false';
        var branch = gen.statementToCode(block, 'DO');
        if (until) {
            argument0 = '!' + argument0;
        }
        return 'while (' + argument0 + ') {\n' + branch + '}\n';
    };

    gen.forBlock['controls_if'] = function (block) {
        var n = 0;
        var code = '';
        do {
            var conditionCode = gen.valueToCode(block, 'IF' + n, gen.ORDER_NONE) || 'false';
            var branchCode = gen.statementToCode(block, 'DO' + n);
            code += (n > 0 ? ' else ' : '') + 'if (' + conditionCode + ') {\n' + branchCode + '}';
            n++;
        } while (block.getInput('IF' + n));
        if (block.getInput('ELSE')) {
            var branchElse = gen.statementToCode(block, 'ELSE');
            code += ' else {\n' + branchElse + '}';
        }
        return code + '\n';
    };

})();
