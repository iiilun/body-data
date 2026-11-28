export const PROLOGUE_LOCALES={en:'en',es:'es',fr:'fr',zh:'zh-Hant',ja:'ja',ko:'ko',ar:'ar'};

export const prologueCopy={
 en:{title:'WHY',continue:'ENTER',stories:[
  'The world moves forward. The basics of life still do not reach everyone.',
  'This work brings distant data into a reality your body can feel.',
  'Here, data becomes heat, weight, resistance and distance.',
  'One body enters the realities of water, care, housing and connection.',
  'We hope you leave remembering one number and caring about the people behind it.'
 ]},
 es:{title:'POR QUÉ',continue:'ENTRAR',stories:[
  'El mundo avanza. Lo esencial para vivir aún no llega a todas las personas.',
  'Esta obra acerca los datos lejanos a una realidad que tu cuerpo puede sentir.',
  'Aquí, los datos se convierten en calor, peso, resistencia y distancia.',
  'Un solo cuerpo entra en las realidades del agua, los cuidados, la vivienda y la conexión.',
  'Ojalá te lleves un número en la memoria y empieces a mirar a las personas que hay detrás.'
 ]},
 fr:{title:'POURQUOI',continue:'ENTRER',stories:[
  'Le monde avance. Les conditions essentielles de la vie ne parviennent toujours pas à tout le monde.',
  'Cette œuvre rapproche les données lointaines d’une réalité que ton corps peut ressentir.',
  'Ici, les données deviennent chaleur, poids, résistance et distance.',
  'Un seul corps entre dans les réalités de l’eau, du soin, du logement et de la connexion.',
  'Nous espérons que tu repartiras avec un chiffre en mémoire et une attention pour les personnes qu’il représente.'
 ]},
 zh:{title:'為什麼',continue:'進入',stories:[
  '世界在前進，生活的基本條件卻還沒有抵達每一個人。',
  '這件作品，想讓遙遠的數據，成為身體感覺得到的現實。',
  '這裡，數據成為熱、重量、阻力與距離。',
  '用一個身體，走進水、照顧、居住與連線的現實。',
  '希望你離開時，記住一個數字，也開始在意數字裡的人。'
 ]},
 ja:{title:'なぜ',continue:'入る',stories:[
  '世界は前へ進んでいる。それでも、生きるための基本は、まだすべての人に届いていない。',
  'この作品は、遠くのデータを、身体で感じられる現実へと近づける。',
  'ここでは、データが熱、重さ、抵抗、距離になる。',
  'ひとつの身体で、水、ケア、住まい、つながりの現実に入っていく。',
  'ここを出るとき、ひとつの数字を覚え、その向こうにいる人を気にかけてほしい。'
 ]},
 ko:{title:'왜',continue:'입장',stories:[
  '세상은 앞으로 나아가지만, 삶의 기본 조건은 아직 모두에게 닿지 않았습니다.',
  '이 작품은 멀리 있는 데이터를 몸으로 느낄 수 있는 현실로 다가오게 합니다.',
  '여기서 데이터는 열, 무게, 저항과 거리가 됩니다.',
  '하나의 몸으로 물, 돌봄, 주거와 연결의 현실에 들어갑니다.',
  '떠날 때 숫자 하나를 기억하고, 그 숫자 속 사람들에게도 마음이 닿기를 바랍니다.'
 ]},
 ar:{title:'لماذا',continue:'ادخل',stories:[
  'يتقدم العالم، لكن أساسيات الحياة لم تصل بعد إلى الجميع.',
  'يقرب هذا العمل البيانات البعيدة إلى واقع يمكن لجسدك أن يشعر به.',
  'هنا تصبح البيانات حرارة ووزناً ومقاومة ومسافة.',
  'بجسد واحد، تدخل واقع الماء والرعاية والسكن والاتصال.',
  'نأمل أن تغادر وأنت تتذكر رقماً واحداً وتهتم بالناس الذين يقفون وراءه.'
 ]}
};

export function prologueLanguage(language){return Object.hasOwn(prologueCopy,language)?language:'en';}
