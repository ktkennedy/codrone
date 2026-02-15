/**
 * 커스텀 드론 블록 정의 (한국어)
 * Google Blockly에서 사용할 드론 조종 블록들을 정의합니다.
 */
(function () {
    'use strict';

    // 블록 색상
    var DRONE_COLOR = '#4a9eff';
    var MOVE_COLOR = '#44bb77';
    var SENSOR_COLOR = '#bb44aa';
    var CONTROL_COLOR = '#ffaa44';

    // ===== 기본 동작 블록 =====

    Blockly.Blocks['drone_takeoff'] = {
        init: function () {
            this.appendDummyInput().appendField('이륙하기');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(DRONE_COLOR);
            this.setTooltip('드론을 이륙시킵니다.');
        }
    };

    Blockly.Blocks['drone_land'] = {
        init: function () {
            this.appendDummyInput().appendField('착륙하기');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(DRONE_COLOR);
            this.setTooltip('드론을 착륙시킵니다.');
        }
    };

    Blockly.Blocks['drone_hover'] = {
        init: function () {
            this.appendValueInput('SECONDS')
                .setCheck('Number')
                .appendField('호버링');
            this.appendDummyInput().appendField('초');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(DRONE_COLOR);
            this.setTooltip('지정한 시간 동안 제자리에서 떠 있습니다.');
        }
    };

    // ===== 이동 블록 =====

    Blockly.Blocks['drone_move_forward'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('앞으로 가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('앞으로 지정한 거리만큼 이동합니다.');
        }
    };

    Blockly.Blocks['drone_move_backward'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('뒤로 가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('뒤로 지정한 거리만큼 이동합니다.');
        }
    };

    Blockly.Blocks['drone_move_left'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('왼쪽으로 가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('왼쪽으로 지정한 거리만큼 이동합니다.');
        }
    };

    Blockly.Blocks['drone_move_right'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('오른쪽으로 가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('오른쪽으로 지정한 거리만큼 이동합니다.');
        }
    };

    Blockly.Blocks['drone_move_up'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('위로 올라가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('위로 지정한 높이만큼 올라갑니다.');
        }
    };

    Blockly.Blocks['drone_move_down'] = {
        init: function () {
            this.appendValueInput('DISTANCE')
                .setCheck('Number')
                .appendField('아래로 내려가기');
            this.appendDummyInput().appendField('m');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('아래로 지정한 높이만큼 내려갑니다.');
        }
    };

    // ===== 회전 블록 =====

    Blockly.Blocks['drone_turn_left'] = {
        init: function () {
            this.appendValueInput('ANGLE')
                .setCheck('Number')
                .appendField('왼쪽으로 회전');
            this.appendDummyInput().appendField('도');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('왼쪽으로 지정한 각도만큼 회전합니다.');
        }
    };

    Blockly.Blocks['drone_turn_right'] = {
        init: function () {
            this.appendValueInput('ANGLE')
                .setCheck('Number')
                .appendField('오른쪽으로 회전');
            this.appendDummyInput().appendField('도');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(MOVE_COLOR);
            this.setTooltip('오른쪽으로 지정한 각도만큼 회전합니다.');
        }
    };

    // ===== 대기 블록 =====

    Blockly.Blocks['drone_wait'] = {
        init: function () {
            this.appendValueInput('SECONDS')
                .setCheck('Number')
                .appendField('기다리기');
            this.appendDummyInput().appendField('초');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(CONTROL_COLOR);
            this.setTooltip('지정한 시간 동안 기다립니다.');
        }
    };

    // ===== 센서 블록 =====

    Blockly.Blocks['drone_get_altitude'] = {
        init: function () {
            this.appendDummyInput().appendField('현재 높이');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('현재 드론의 높이(m)를 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_speed'] = {
        init: function () {
            this.appendDummyInput().appendField('현재 속도');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('현재 드론의 속도(m/s)를 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_battery'] = {
        init: function () {
            this.appendDummyInput().appendField('배터리 잔량');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('배터리 잔량(%)을 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_front_distance'] = {
        init: function () {
            this.appendDummyInput().appendField('앞쪽 거리');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('앞쪽 장애물까지의 거리(m)를 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_ground_color'] = {
        init: function () {
            this.appendDummyInput().appendField('바닥 색상');
            this.setOutput(true, 'String');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('바닥의 색상을 반환합니다.');
        }
    };

    // ===== 자율비행 블록 =====

    var NAV_COLOR = '#ff8844';

    Blockly.Blocks['drone_fly_to'] = {
        init: function () {
            this.appendDummyInput().appendField('좌표로 비행');
            this.appendValueInput('X').setCheck('Number').appendField('X:');
            this.appendValueInput('Y').setCheck('Number').appendField('Y:');
            this.appendValueInput('Z').setCheck('Number').appendField('Z:');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(NAV_COLOR);
            this.setTooltip('지정한 좌표(X, Y높이, Z)로 자동 비행합니다.');
        }
    };

    Blockly.Blocks['drone_return_home'] = {
        init: function () {
            this.appendDummyInput().appendField('홈으로 귀환');
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(NAV_COLOR);
            this.setTooltip('이륙 지점으로 자동 귀환합니다.');
        }
    };

    Blockly.Blocks['drone_follow_path'] = {
        init: function () {
            this.appendDummyInput().appendField('경로 비행');
            this.appendStatementInput('WAYPOINTS').setCheck(null);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(NAV_COLOR);
            this.setTooltip('내부 블록에 정의된 웨이포인트를 순서대로 방문합니다.');
        }
    };

    Blockly.Blocks['drone_add_waypoint'] = {
        init: function () {
            this.appendDummyInput().appendField('경유지 추가');
            this.appendValueInput('X').setCheck('Number').appendField('X:');
            this.appendValueInput('Z').setCheck('Number').appendField('Z:');
            this.appendValueInput('Y').setCheck('Number').appendField('높이:');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(NAV_COLOR);
            this.setTooltip('경로에 경유 지점을 추가합니다.');
        }
    };

    Blockly.Blocks['drone_set_speed'] = {
        init: function () {
            this.appendValueInput('SPEED')
                .setCheck('Number')
                .appendField('비행 속도 설정');
            this.appendDummyInput().appendField('m/s');
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(NAV_COLOR);
            this.setTooltip('자율비행 속도를 설정합니다 (1~10).');
        }
    };

    // ===== 자율비행 센서 블록 =====

    Blockly.Blocks['drone_get_position_x'] = {
        init: function () {
            this.appendDummyInput().appendField('현재 X 좌표');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('드론의 현재 X 좌표를 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_position_z'] = {
        init: function () {
            this.appendDummyInput().appendField('현재 Z 좌표');
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('드론의 현재 Z 좌표를 반환합니다.');
        }
    };

    Blockly.Blocks['drone_get_distance_to'] = {
        init: function () {
            this.appendDummyInput().appendField('거리 측정');
            this.appendValueInput('X').setCheck('Number').appendField('X:');
            this.appendValueInput('Z').setCheck('Number').appendField('Z:');
            this.setInputsInline(true);
            this.setOutput(true, 'Number');
            this.setColour(SENSOR_COLOR);
            this.setTooltip('지정한 좌표까지의 수평 거리를 반환합니다.');
        }
    };

})();
