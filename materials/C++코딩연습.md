# C++ 코딩 연습 — 12레슨 커리큘럼

> **왜 C++를 배울까?**
> 실제 드론 펌웨어(ArduPilot, PX4)와 게임 엔진(Unreal Engine)은 C++로 만들어집니다.
> Python과 함께 C++를 익히면 "드론 조종사"에서 "드론 개발자"로 한 단계 올라갈 수 있어요!
> Python이 쉽고 빠른 언어라면, C++는 빠르고 강력한 언어입니다.

---

## 대상: 초등 4~6학년 | 총 12레슨 | 언어: 한국어

---

# STAGE 1 — C++ 기초 (레슨 1~7)

---

## 레슨 1: `cout` — 화면 출력 (1주차 대응)

### 학습 목표
- C++ 프로그램의 기본 구조를 이해한다.
- `cout`으로 글자를 화면에 출력할 수 있다.

### 핵심 개념

C++ 프로그램에는 반드시 필요한 틀이 있어요. 처음엔 외우지 않아도 됩니다 — 복사해서 쓰다 보면 자연스럽게 기억돼요!

| 코드 | 역할 |
|---|---|
| `#include <iostream>` | 화면 출력 기능을 불러온다 |
| `using namespace std;` | `std::cout` 대신 `cout`만 써도 되게 한다 |
| `int main() { }` | 프로그램이 시작하는 곳 |
| `cout << "텍스트"` | 화면에 텍스트를 출력한다 |
| `endl` | 줄 바꿈 (엔터) |
| `return 0;` | main 함수가 정상 종료되었다고 알린다 |

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 출력 | `print("안녕!")` | `cout << "안녕!" << endl;` |
| 시작점 | 그냥 위에서 아래로 실행 | `int main()` 함수 안에서 시작 |
| 세미콜론 | 없음 | 문장 끝에 `;` 필수 |
| 헤더 | `import` (선택) | `#include` (필수) |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "안녕하세요!" << endl;
    cout << "드론 코딩 수업에 오신 것을 환영합니다." << endl;
    return 0;
}
```

**출력 결과:**
```
안녕하세요!
드론 코딩 수업에 오신 것을 환영합니다.
```

### 연습문제

"드론 출발!" 이라는 글자를 화면에 출력하는 C++ 프로그램을 작성하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "드론 출발!" << endl;
    return 0;
}
```

> **팁:** `<<` 기호를 여러 번 이어 쓰면 한 줄에 여러 내용을 출력할 수 있어요.
> `cout << "이름: " << "드론" << endl;`

---

## 레슨 2: 변수 — 값 저장 (2주차 대응)

### 학습 목표
- C++에서 변수를 선언하고 값을 저장할 수 있다.
- Python 변수와 C++ 변수의 차이점을 설명할 수 있다.

### 핵심 개념

Python은 `name = "드론"`처럼 타입을 쓰지 않아도 됐어요.
C++는 변수를 만들 때 **타입을 반드시 먼저 써야** 합니다!

```
타입 변수이름 = 값;
```

예:
```cpp
string name = "Coding Drone";
int age = 10;
```

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 문자열 변수 | `name = "드론"` | `string name = "드론";` |
| 정수 변수 | `age = 10` | `int age = 10;` |
| 실수 변수 | `speed = 3.5` | `double speed = 3.5;` |
| 타입 명시 | 불필요 | 필수 |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    string name = "Coding Drone";
    int age = 10;
    double speed = 3.5;

    cout << "이름: " << name << endl;
    cout << "나이: " << age << endl;
    cout << "속도: " << speed << "m/s" << endl;
    return 0;
}
```

**출력 결과:**
```
이름: Coding Drone
나이: 10
속도: 3.5m/s
```

### 연습문제

좋아하는 동물의 이름과 다리 수를 변수로 만들고 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    string animal = "강아지";
    int legs = 4;

    cout << "동물: " << animal << endl;
    cout << "다리 수: " << legs << "개" << endl;
    return 0;
}
```

> **주의:** C++에서 `string`을 쓰려면 `#include <iostream>` 또는 `#include <string>`이 필요해요.
> `using namespace std;`를 쓰면 `string`이라고만 써도 됩니다.

---

## 레슨 3: 자료형 — 숫자와 문자열 (3주차 대응)

### 학습 목표
- C++의 기본 자료형(int, double, string, bool)을 구분할 수 있다.
- 각 자료형에 맞는 값을 저장할 수 있다.

### 핵심 개념

| 자료형 | 의미 | 예시 |
|---|---|---|
| `int` | 정수 (소수점 없음) | `10`, `-3`, `100` |
| `double` | 실수 (소수점 있음) | `3.14`, `2.5`, `-0.1` |
| `string` | 문자열 (글자들) | `"드론"`, `"hello"` |
| `bool` | 참/거짓 | `true`, `false` |

> Python은 값을 보고 자동으로 타입을 정하지만, C++는 프로그래머가 직접 정해야 해요!

### Python vs C++ 비교

| 종류 | Python | C++ |
|---|---|---|
| 정수 | `count = 5` | `int count = 5;` |
| 실수 | `height = 1.8` | `double height = 1.8;` |
| 문자열 | `msg = "출발"` | `string msg = "출발";` |
| 참/거짓 | `flying = True` | `bool flying = true;` |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    int altitude = 5;          // 고도 (정수, 미터)
    double battery = 87.5;     // 배터리 (실수, %)
    string mode = "자동비행";   // 비행 모드 (문자열)
    bool isFlying = true;       // 비행 중? (참/거짓)

    cout << "고도: " << altitude << "m" << endl;
    cout << "배터리: " << battery << "%" << endl;
    cout << "모드: " << mode << endl;
    cout << "비행 중: " << isFlying << endl;
    return 0;
}
```

**출력 결과:**
```
고도: 5m
배터리: 87.5%
모드: 자동비행
비행 중: 1
```

> **팁:** `bool`을 `cout`으로 출력하면 `true`는 `1`, `false`는 `0`으로 나와요.

### 연습문제

드론 정보를 나타내는 변수 4개(이름, 무게, 배터리, 작동중)를 만들고 모두 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    string droneName = "미니드론";
    double weight = 0.25;   // kg
    int battery = 95;       // %
    bool active = true;

    cout << "드론 이름: " << droneName << endl;
    cout << "무게: " << weight << "kg" << endl;
    cout << "배터리: " << battery << "%" << endl;
    cout << "작동 중: " << active << endl;
    return 0;
}
```

---

## 레슨 4: 연산 — 계산하기 (4주차 대응)

### 학습 목표
- C++에서 사칙연산과 나머지 연산을 사용할 수 있다.
- 정수 나눗셈의 특징을 이해한다.

### 핵심 개념

| 연산자 | 의미 | 예시 | 결과 |
|---|---|---|---|
| `+` | 더하기 | `3 + 4` | `7` |
| `-` | 빼기 | `10 - 3` | `7` |
| `*` | 곱하기 | `5 * 2` | `10` |
| `/` | 나누기 | `10 / 4` | `2` (정수!) |
| `%` | 나머지 | `10 % 3` | `1` |

### 중요한 차이점: 정수 나눗셈

```cpp
int a = 10 / 3;      // a = 3  (소수점 버림!)
double b = 10.0 / 3; // b = 3.333...
```

Python에서는 `10 / 3 = 3.333...`이지만,
C++에서 `int`끼리 나누면 소수점이 버려져요!

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 10 / 3 결과 | `3.3333...` | `3` (정수면) |
| 정수 나누기 | `10 // 3` → `3` | `10 / 3` → `3` |
| 나머지 | `10 % 3` → `1` | `10 % 3` → `1` |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    int width = 6;
    int height = 4;

    int perimeter = 2 * (width + height);   // 둘레
    int area = width * height;               // 넓이

    cout << "가로: " << width << "cm" << endl;
    cout << "세로: " << height << "cm" << endl;
    cout << "둘레: " << perimeter << "cm" << endl;
    cout << "넓이: " << area << "cm^2" << endl;
    return 0;
}
```

**출력 결과:**
```
가로: 6cm
세로: 4cm
둘레: 20cm
넓이: 24cm^2
```

### 연습문제

가로 8, 세로 5인 직사각형의 둘레와 넓이를 계산해서 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int width = 8;
    int height = 5;

    int perimeter = 2 * (width + height);
    int area = width * height;

    cout << "둘레: " << perimeter << endl;
    cout << "넓이: " << area << endl;
    return 0;
}
```

> **주의:** 실수 계산이 필요하면 `double`을 사용하세요.
> `double result = 10.0 / 3;` → `3.33333`

---

## 레슨 5: `for` 반복문 — 반복하기 (5주차 대응)

### 학습 목표
- C++ `for` 반복문의 구조를 이해한다.
- Python의 `for`와 C++의 `for`를 비교할 수 있다.

### 핵심 개념

```cpp
for (초기값; 조건; 증가) {
    // 반복할 코드
}
```

예:
```cpp
for (int i = 0; i < 5; i++) {
    cout << i << endl;
}
```

| 부분 | 의미 |
|---|---|
| `int i = 0` | i를 0으로 시작 |
| `i < 5` | i가 5보다 작을 동안 반복 |
| `i++` | 한 번 반복할 때마다 i에 1을 더함 |

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 반복 구조 | `for i in range(5):` | `for (int i = 0; i < 5; i++)` |
| 블록 구분 | 들여쓰기 | `{ }` 중괄호 |
| 범위 | `range(5)` → 0,1,2,3,4 | `i < 5` → 0,1,2,3,4 |
| 세미콜론 | 없음 | for 안에 `;` 2개 |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    // 1부터 5까지 출력
    for (int i = 1; i <= 5; i++) {
        cout << i << "번째 비행 중..." << endl;
    }
    cout << "비행 완료!" << endl;
    return 0;
}
```

**출력 결과:**
```
1번째 비행 중...
2번째 비행 중...
3번째 비행 중...
4번째 비행 중...
5번째 비행 중...
비행 완료!
```

### 연습문제

1부터 5까지의 합계를 구해서 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum = sum + i;
    }
    cout << "1~5 합계: " << sum << endl;
    return 0;
}
```

**출력 결과:**
```
1~5 합계: 15
```

> **팁:** `i++`는 `i = i + 1`과 같아요. `i += 2`라고 쓰면 2씩 증가합니다.
> `i--`는 1씩 감소시킬 때 사용해요.

---

## 레슨 6: `if/else` 조건문 — 판단하기 (6주차 대응)

### 학습 목표
- C++ `if/else` 문으로 조건에 따라 다른 코드를 실행할 수 있다.
- 비교 연산자와 논리 연산자를 사용할 수 있다.

### 핵심 개념

```cpp
if (조건) {
    // 조건이 참일 때
} else if (다른 조건) {
    // 다른 조건이 참일 때
} else {
    // 모두 아닐 때
}
```

**비교 연산자:**

| 연산자 | 의미 | 예시 |
|---|---|---|
| `==` | 같다 | `a == 5` |
| `!=` | 다르다 | `a != 0` |
| `>` | 크다 | `a > 10` |
| `<` | 작다 | `a < 10` |
| `>=` | 크거나 같다 | `a >= 5` |
| `<=` | 작거나 같다 | `a <= 5` |

**논리 연산자:**

| C++ | Python | 의미 |
|---|---|---|
| `&&` | `and` | 둘 다 참 |
| `\|\|` | `or` | 하나라도 참 |
| `!` | `not` | 반대 |

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| if | `if 조건:` | `if (조건) {` |
| else if | `elif 조건:` | `} else if (조건) {` |
| else | `else:` | `} else {` |
| 블록 끝 | 들여쓰기 끝 | `}` |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

int main() {
    int temperature = 28;

    if (temperature >= 30) {
        cout << "매우 더워요! 드론 배터리가 빨리 닳아요." << endl;
    } else if (temperature >= 20) {
        cout << "비행하기 좋은 날씨예요!" << endl;
    } else if (temperature >= 10) {
        cout << "조금 쌀쌀하네요. 따뜻하게 입으세요." << endl;
    } else {
        cout << "너무 추워요! 드론 비행을 삼가세요." << endl;
    }
    return 0;
}
```

**출력 결과 (temperature = 28):**
```
비행하기 좋은 날씨예요!
```

### 연습문제

배터리 잔량이 20 이하면 "충전하세요!", 50 이하면 "절반 남았어요.", 그 외는 "배터리 충분!"을 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int main() {
    int battery = 35;

    if (battery <= 20) {
        cout << "충전하세요!" << endl;
    } else if (battery <= 50) {
        cout << "절반 남았어요." << endl;
    } else {
        cout << "배터리 충분!" << endl;
    }
    return 0;
}
```

> **주의:** `=`는 값을 저장하는 것, `==`는 같은지 비교하는 것입니다.
> `if (a = 5)` (틀림!) vs `if (a == 5)` (맞음!)

---

## 레슨 7: 함수 — 나만의 명령 (7주차 대응)

### 학습 목표
- C++ 함수를 정의하고 호출할 수 있다.
- 매개변수와 반환값이 있는 함수를 만들 수 있다.

### 핵심 개념

```cpp
반환형 함수이름(매개변수 타입 이름) {
    // 함수 내용
    return 값;
}
```

| 반환형 | 의미 |
|---|---|
| `void` | 반환값 없음 (Python의 return 없는 함수) |
| `int` | 정수 반환 |
| `double` | 실수 반환 |
| `string` | 문자열 반환 |
| `bool` | 참/거짓 반환 |

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 함수 선언 | `def greet(name):` | `void greet(string name) {` |
| 반환 | `return result` | `return result;` |
| 반환형 | 자동 | 미리 선언 필요 |
| 매개변수 타입 | 자동 | 타입 명시 필요 |

### 예제 코드

```cpp
#include <iostream>
using namespace std;

// void 함수: 반환값 없음
void greet(string name) {
    cout << "안녕하세요, " << name << "!" << endl;
}

// int 반환 함수: 두 수 중 큰 값 반환
int bigger(int a, int b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

int main() {
    greet("드론 파일럿");

    int result = bigger(7, 12);
    cout << "더 큰 수: " << result << endl;
    return 0;
}
```

**출력 결과:**
```
안녕하세요, 드론 파일럿!
더 큰 수: 12
```

### 연습문제

두 정수 a, b를 받아서 더 큰 값을 반환하는 `bigger(a, b)` 함수를 만들고, `bigger(15, 9)`를 호출해서 결과를 출력하세요.

**정답:**
```cpp
#include <iostream>
using namespace std;

int bigger(int a, int b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

int main() {
    int result = bigger(15, 9);
    cout << "더 큰 수: " << result << endl;
    return 0;
}
```

> **팁:** 함수는 `main()` 함수보다 **위에** 정의해야 해요.
> 아래에 정의하면 C++ 컴파일러가 찾지 못할 수 있어요.

---

# STAGE 2 — C++ + 드론 (레슨 8~12)

> **드론 API 안내:** 이 단계에서는 드론을 `Drone` 클래스의 객체로 다룹니다.
> 실제 하드웨어 없이도 시뮬레이터로 같은 코드를 실행할 수 있어요!

---

## 레슨 8: 드론 기초 — 이륙과 착륙 (8주차 대응)

### 학습 목표
- C++ 드론 객체를 만들고 기본 명령을 호출할 수 있다.
- 클래스와 객체의 개념을 간단히 이해한다.

### 핵심 개념

C++에서 드론은 **클래스(class)** 로 만들어진 **객체(object)** 입니다.
마치 설계도(클래스)로 실제 드론(객체)을 만드는 것처럼요!

```cpp
Drone drone;         // 드론 객체 만들기
drone.takeoff();     // 이륙
drone.hover(2);      // 2초 정지 비행
drone.land();        // 착륙
```

**기본 드론 명령어:**

| 명령어 | 설명 |
|---|---|
| `drone.takeoff()` | 드론 이륙 |
| `drone.hover(초)` | 주어진 시간(초) 동안 제자리 비행 |
| `drone.land()` | 드론 착륙 |
| `drone.get_battery()` | 배터리 잔량 반환 (int) |

### Python vs C++ 비교

| | Python | C++ |
|---|---|---|
| 객체 생성 | `drone = Drone()` | `Drone drone;` |
| 메서드 호출 | `drone.takeoff()` | `drone.takeoff();` |
| 결과 저장 | `batt = drone.get_battery()` | `int batt = drone.get_battery();` |

### 예제 코드

```cpp
#include <iostream>
#include "Drone.h"   // 드론 라이브러리
using namespace std;

int main() {
    Drone drone;

    cout << "드론 이륙!" << endl;
    drone.takeoff();

    cout << "2초 정지 비행..." << endl;
    drone.hover(2);

    int batt = drone.get_battery();
    cout << "배터리 잔량: " << batt << "%" << endl;

    cout << "드론 착륙!" << endl;
    drone.land();

    return 0;
}
```

**출력 결과:**
```
드론 이륙!
2초 정지 비행...
배터리 잔량: 95%
드론 착륙!
```

### 연습문제

드론을 이륙시키고 3초 동안 정지 비행한 뒤 착륙시키는 코드를 작성하세요. 배터리 잔량도 중간에 출력하세요.

**정답:**
```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;

    drone.takeoff();
    cout << "이륙 성공!" << endl;

    int batt = drone.get_battery();
    cout << "배터리: " << batt << "%" << endl;

    drone.hover(3);
    cout << "3초 정지 완료" << endl;

    drone.land();
    cout << "착륙 완료!" << endl;

    return 0;
}
```

> **클래스 맛보기:** `Drone drone;`에서 `Drone`은 설계도(클래스), `drone`은 그 설계도로 만든 실제 물체(객체)예요. 점(`.`)을 써서 그 물체의 기능(메서드)을 사용합니다.

---

## 레슨 9: 드론 이동 — 전진과 회전 (9주차 대응)

### 학습 목표
- 드론 이동과 회전 명령을 사용할 수 있다.
- 이동 거리와 각도를 계산하는 함수를 만들 수 있다.

### 핵심 개념

**이동 명령어:**

| 명령어 | 설명 |
|---|---|
| `drone.move_forward(m)` | m미터 전진 |
| `drone.move_backward(m)` | m미터 후진 |
| `drone.move_left(m)` | m미터 왼쪽 이동 |
| `drone.move_right(m)` | m미터 오른쪽 이동 |
| `drone.move_up(m)` | m미터 상승 |
| `drone.move_down(m)` | m미터 하강 |
| `drone.turn_left(도)` | 왼쪽으로 회전 |
| `drone.turn_right(도)` | 오른쪽으로 회전 |

### 예제 코드

```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

// 전진 거리를 두 배로 계산하는 함수
double doubleDist(double dist) {
    return dist * 2.0;
}

int main() {
    Drone drone;
    drone.takeoff();

    cout << "전진 5m" << endl;
    drone.move_forward(5);

    cout << "오른쪽으로 90도 회전" << endl;
    drone.turn_right(90);

    double next = doubleDist(3.0);
    cout << "전진 " << next << "m" << endl;
    drone.move_forward(next);

    drone.land();
    return 0;
}
```

**출력 결과:**
```
전진 5m
오른쪽으로 90도 회전
전진 6m
```

### 연습문제

드론이 앞으로 3m 이동하고, 왼쪽으로 90도 돌고, 다시 3m 이동한 뒤 착륙하는 코드를 작성하세요.

**정답:**
```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;

    drone.takeoff();
    drone.move_forward(3);
    cout << "3m 전진 완료" << endl;

    drone.turn_left(90);
    cout << "왼쪽 90도 회전 완료" << endl;

    drone.move_forward(3);
    cout << "3m 전진 완료" << endl;

    drone.land();
    cout << "착륙!" << endl;
    return 0;
}
```

> **팁:** 360도 회전은 `turn_right(360)`으로 제자리로 돌아옵니다.
> `turn_right(90)`을 4번 실행하면 같은 효과예요!

---

## 레슨 10: 반복문 + 드론 — 도형 비행 (10주차 대응)

### 학습 목표
- `for` 반복문으로 사각형, 삼각형 비행 경로를 만들 수 있다.
- Python과 C++ 도형 비행 코드를 비교할 수 있다.

### 핵심 개념

사각형 비행 = 전진 → 90도 회전 → 4번 반복!

```
for (int i = 0; i < 4; i++) {
    전진
    오른쪽 90도 회전
}
```

### Python vs C++ 비교 (사각형 비행)

**Python:**
```python
drone.takeoff()
for i in range(4):
    drone.move_forward(3)
    drone.turn_right(90)
drone.land()
```

**C++:**
```cpp
drone.takeoff();
for (int i = 0; i < 4; i++) {
    drone.move_forward(3);
    drone.turn_right(90);
}
drone.land();
```

### 예제 코드 — 사각형 비행

```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;

    cout << "사각형 비행 시작!" << endl;
    drone.takeoff();

    for (int i = 0; i < 4; i++) {
        cout << (i + 1) << "번째 변 비행 중..." << endl;
        drone.move_forward(4);
        drone.turn_right(90);
    }

    drone.land();
    cout << "사각형 비행 완료!" << endl;
    return 0;
}
```

**출력 결과:**
```
사각형 비행 시작!
1번째 변 비행 중...
2번째 변 비행 중...
3번째 변 비행 중...
4번째 변 비행 중...
사각형 비행 완료!
```

### 연습문제

삼각형 비행(120도씩 3번 회전)을 `for` 반복문으로 구현하세요.

**정답:**
```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;

    cout << "삼각형 비행 시작!" << endl;
    drone.takeoff();

    for (int i = 0; i < 3; i++) {
        drone.move_forward(4);
        drone.turn_right(120);
    }

    drone.land();
    cout << "삼각형 비행 완료!" << endl;
    return 0;
}
```

> **수학 연결:** 삼각형 외각의 합 = 360도 → 360 / 3 = 120도씩 회전!
> 육각형이라면? 360 / 6 = 60도씩 회전하면 됩니다.

---

## 레슨 11: 함수 + 드론 — 비행 패턴 (11주차 대응)

### 학습 목표
- 재사용 가능한 비행 함수를 만들 수 있다.
- 매개변수로 비행 패턴을 조절할 수 있다.

### 핵심 개념

같은 코드를 반복 쓰지 않고 **함수**로 만들면:
- 코드가 짧아진다
- 나중에 고치기 쉽다
- 다른 곳에서도 재사용할 수 있다

### 예제 코드

```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

// 다각형 비행 함수
// sides: 변의 수 (3=삼각형, 4=사각형, 6=육각형)
// size: 각 변의 길이 (미터)
void fly_polygon(Drone& drone, int sides, double size) {
    double turnAngle = 360.0 / sides;

    cout << sides << "각형 비행 시작 (한 변: " << size << "m)" << endl;

    for (int i = 0; i < sides; i++) {
        drone.move_forward(size);
        drone.turn_right(turnAngle);
    }

    cout << sides << "각형 비행 완료!" << endl;
}

int main() {
    Drone drone;
    drone.takeoff();

    // 삼각형 비행
    fly_polygon(drone, 3, 3.0);

    drone.hover(1);

    // 사각형 비행
    fly_polygon(drone, 4, 4.0);

    drone.land();
    return 0;
}
```

**출력 결과:**
```
3각형 비행 시작 (한 변: 3m)
3각형 비행 완료!
4각형 비행 시작 (한 변: 4m)
4각형 비행 완료!
```

### 연습문제

배터리가 40% 미만이면 착륙하고, 그렇지 않으면 오각형 비행(`fly_polygon(drone, 5, 2.0)`)을 실행하는 코드를 작성하세요.

**정답:**
```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

void fly_polygon(Drone& drone, int sides, double size) {
    double turnAngle = 360.0 / sides;
    for (int i = 0; i < sides; i++) {
        drone.move_forward(size);
        drone.turn_right(turnAngle);
    }
}

int main() {
    Drone drone;
    drone.takeoff();

    int batt = drone.get_battery();
    if (batt < 40) {
        cout << "배터리 부족! 착륙합니다." << endl;
        drone.land();
    } else {
        cout << "배터리 충분. 오각형 비행!" << endl;
        fly_polygon(drone, 5, 2.0);
        drone.land();
    }
    return 0;
}
```

> **C++ 심화:** `Drone& drone`에서 `&`는 "참조(reference)"라는 뜻이에요.
> 드론 객체를 복사하지 않고 원본을 그대로 사용하게 해줍니다.
> 지금은 "이렇게 써야 드론이 제대로 움직인다" 정도로만 기억하세요!

---

## 레슨 12: 조건문 + 드론 — 센서 비행 (12주차 대응)

### 학습 목표
- 드론 센서 데이터를 읽어 조건문으로 자율 판단할 수 있다.
- 반복문 + 조건문 + 함수를 통합해서 자율 비행 코드를 만들 수 있다.

### 핵심 개념

**센서 명령어:**

| 명령어 | 반환형 | 설명 |
|---|---|---|
| `drone.get_altitude()` | `double` | 현재 고도 (미터) |
| `drone.get_battery()` | `int` | 배터리 잔량 (%) |
| `drone.get_obstacle_distance()` | `double` | 전방 장애물까지 거리 (미터) |
| `drone.is_flying()` | `bool` | 현재 비행 중이면 true |

### 예제 코드 — 자율 고도 유지 비행

```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;
    drone.takeoff();

    // 10번 반복하며 고도 확인 및 조정
    for (int i = 0; i < 10; i++) {
        double alt = drone.get_altitude();
        int batt = drone.get_battery();

        cout << "[" << (i + 1) << "] 고도: " << alt
             << "m, 배터리: " << batt << "%" << endl;

        // 배터리 부족 시 즉시 착륙
        if (batt < 20) {
            cout << "배터리 부족! 비상 착륙." << endl;
            drone.land();
            return 0;
        }

        // 고도 조정
        if (alt < 2.0) {
            cout << "고도 낮음 → 상승" << endl;
            drone.move_up(0.5);
        } else if (alt > 5.0) {
            cout << "고도 높음 → 하강" << endl;
            drone.move_down(0.5);
        } else {
            cout << "고도 정상 → 전진" << endl;
            drone.move_forward(1);
        }
    }

    drone.land();
    cout << "임무 완료! 착륙." << endl;
    return 0;
}
```

**출력 결과 (예시):**
```
[1] 고도: 3.0m, 배터리: 95%
고도 정상 → 전진
[2] 고도: 3.2m, 배터리: 94%
고도 정상 → 전진
...
임무 완료! 착륙.
```

### 연습문제

전방 장애물 거리가 1.5m 이하면 "장애물 감지! 정지"를 출력하고 착륙, 그렇지 않으면 계속 전진하는 코드를 작성하세요 (5번 반복).

**정답:**
```cpp
#include <iostream>
#include "Drone.h"
using namespace std;

int main() {
    Drone drone;
    drone.takeoff();

    for (int i = 0; i < 5; i++) {
        double obstacle = drone.get_obstacle_distance();
        cout << "전방 거리: " << obstacle << "m" << endl;

        if (obstacle <= 1.5) {
            cout << "장애물 감지! 정지 및 착륙." << endl;
            drone.land();
            return 0;
        } else {
            drone.move_forward(1);
        }
    }

    drone.land();
    cout << "5번 전진 완료. 착륙." << endl;
    return 0;
}
```

> **자율비행으로 가는 길:**
> 레슨 12까지 배운 내용(변수, 자료형, 연산, 반복문, 조건문, 함수, 드론 API)을 모두 합치면
> 실제 드론 펌웨어와 비슷한 구조의 코드를 작성할 수 있어요!
> 다음 단계에서는 클래스(class)와 포인터(pointer)를 배워 더 강력한 드론 소프트웨어를 만들어 봅시다.

---

## 전체 커리큘럼 요약

| 레슨 | 주제 | 핵심 키워드 | 주차 |
|---|---|---|---|
| 1 | cout — 화면 출력 | `#include`, `cout`, `endl` | 1주차 |
| 2 | 변수 — 값 저장 | `string`, `int`, 타입 선언 | 2주차 |
| 3 | 자료형 — 숫자와 문자열 | `int`, `double`, `bool` | 3주차 |
| 4 | 연산 — 계산하기 | `+`, `-`, `*`, `/`, `%`, 정수 나눗셈 | 4주차 |
| 5 | for 반복문 — 반복하기 | `for (int i = 0; i < n; i++)` | 5주차 |
| 6 | if/else 조건문 — 판단하기 | `if`, `else if`, `else`, `&&`, `\|\|` | 6주차 |
| 7 | 함수 — 나만의 명령 | `void`, `return`, 매개변수 타입 | 7주차 |
| 8 | 드론 기초 — 이륙과 착륙 | `Drone`, 객체, `.takeoff()`, `.land()` | 8주차 |
| 9 | 드론 이동 — 전진과 회전 | `move_forward()`, `turn_right()` | 9주차 |
| 10 | 반복문 + 드론 — 도형 비행 | `for` + 드론 이동 = 다각형 경로 | 10주차 |
| 11 | 함수 + 드론 — 비행 패턴 | `fly_polygon()`, 재사용 함수 | 11주차 |
| 12 | 조건문 + 드론 — 센서 비행 | `get_altitude()`, `get_battery()`, 자율 판단 | 12주차 |

---

## Python vs C++ 최종 비교표

| 개념 | Python | C++ |
|---|---|---|
| 출력 | `print("안녕")` | `cout << "안녕" << endl;` |
| 변수 | `x = 5` | `int x = 5;` |
| 반복 | `for i in range(5):` | `for (int i = 0; i < 5; i++) {` |
| 조건 | `if x > 0:` | `if (x > 0) {` |
| 함수 | `def add(a, b):` | `int add(int a, int b) {` |
| 블록 | 들여쓰기 | `{ }` 중괄호 |
| 문장 끝 | 없음 | `;` 세미콜론 |
| 타입 | 자동 추론 | 직접 선언 |
| 속도 | 빠르게 개발 | 빠르게 실행 |
| 사용 분야 | 스크립트, AI, 데이터 | 드론 펌웨어, 게임, 시스템 |

---

*이 자료는 초등 4~6학년을 위한 드론 코딩 C++ 기초 커리큘럼입니다.*
*Python 12레슨 커리큘럼과 병행 학습하면 두 언어를 비교하며 더 깊이 이해할 수 있습니다.*
