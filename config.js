// How Often? 설정 파일
// 1) Firebase 설정: Firebase 콘솔의 '프로젝트 설정 → 일반 → 내 앱(웹)'에 나오는 firebaseConfig 를 아래에 붙여 넣으세요.
//    (databaseURL 이 꼭 들어 있어야 해요. 비워 두면 같은 컴퓨터 브라우저 안에서만 연결되는 시험 방식이에요.)
// 2) teacherPassword: 비워 두면 누구나 TV 화면(/tv/)에서 방을 만들 수 있어요. 적으면 방 만들 때 물어봐요.
//    (학생이 소스를 보면 알 수 있는 가벼운 잠금이에요.)
// 3) textbookQuestions: '교과서 질문' 버튼으로 넣는 질문(How often do you ___? 의 빈칸 부분)을 바꿀 수 있어요.
window.HO_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCt9mWuCfxzuplNf_kbTO4U37vTM_gYfGU",
    authDomain: "howoften-class.firebaseapp.com",
    databaseURL: "https://howoften-class-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "howoften-class",
    storageBucket: "howoften-class.firebasestorage.app",
    messagingSenderId: "510233663270",
    appId: "1:510233663270:web:b4957693794b8f66a4d3e7"
  },
  teacherPassword: '',
  title: '우리 반 설문 조사 · 6학년 10단원 How often do you ~?',
  textbookQuestions: ['brush your teeth', 'drink water', 'wash your hands', 'exercise', 'eat breakfast', 'eat fast food']
};
