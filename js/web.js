window.IS_WEB_SITE=true;
T.ar.feats=T.ar.feats.slice(); T.ar.feats[3]=["اسأل يونس","مساعد محادثة يعرف خطتك وامتحاناتك ويبحث في ملفاتك، ومع مفتاحك يجيب عن أي سؤال دراسي بإجابات منظّمة."]; T.ar.feats[4]=["اختبار من ملفك","أسئلة إكمال فراغ تُولَّد من ملفك، تُصحَّح فوراً وتذهب أخطاؤك إلى دفترك."];
T.en.feats=T.en.feats.slice(); T.en.feats[3]=["Ask Younis","A chat assistant that knows your plan and exams, searches your files, and with your key answers any study question in clear steps."]; T.en.feats[4]=["Quizzes from your file","Fill-in-the-blank questions built from your file, graded instantly, with mistakes sent to your notebook."];
Object.assign(T.ar,{l_sub:"خطة مذاكرة يوماً بيوم تُبنى على موادك أنت، غرفة تركيز بأصوات هادئة، ملخصات واختبارات من ملفاتك، ومراجعة تثبّت المعلومة حتى يوم الامتحان.",tutorLede:"ارفع ملفات مادتك أو الصق المحتوى، واحصل على أهم ما فيه واختبار منه داخل متصفحك. وإذا فعّلت المعلّم الذكي بمفتاحك، يُرسل ما تطلب شرحه أو تحليله إلى Anthropic فقط."});
Object.assign(T.en,{l_sub:"A day-by-day study plan built on your own courses, a calm focus room, summaries and quizzes from your files, and review that makes it stick until exam day.",tutorLede:"Upload your course files or paste the content, and get its key points and a quiz from it inside your browser. If you turn on the AI tutor with your key, what you ask it to explain or analyse is sent to Anthropic only."});
Object.assign(T.ar,{
 title:"يونس | منصة المذاكرة الذكية",
 l_t4:"يعمل بدون إنترنت بعد أول زيارة",
 webAI:"جرّب المعلّم الذكي الكامل على نسخة Claude",
 tutorOff:"المعلّم في هذا الموقع يعمل بخوارزمية تحليل نصوص داخل متصفحك، بلا إرسال ملفاتك إلى أي خادم: ارفع ملف مادتك لتحصل على أهم جمله واختبار منه.",
 faqs:[["هل الموقع مجاني؟","نعم، بالكامل وبلا إعلانات ولا تسجيل."],["أين تُحفظ بياناتي؟ وهل يراها غيري؟","تُحفظ في متصفحك على جهازك فقط، ولا يراها أحد غيرك، ولا تُرسل إلى أي خادم إلا إذا فعّلت المعلّم الذكي بمفتاحك: عندها يُرسل ما تطلب شرحه أو تحليله إلى Anthropic مباشرة. نزّل نسخة احتياطية من صفحة «إنجازي» لتنقلها إلى جهاز آخر."],["هل يعمل بدون إنترنت؟","نعم، بعد أول زيارة يعمل الموقع بدون اتصال، ويمكنك تثبيته على شاشة جوالك كتطبيق."],["هل يناسب طلاب المدارس؟","نعم، فيه مسار للمدرسة وللتوجيهي والثانوية العامة، ومسار للجامعة."],["هل مواقيت الصلاة دقيقة؟","هي حسابات فلكية تقريبية قد تختلف دقائق عن التقويم الرسمي في بلدك، وتستطيع إيقافها في أي وقت."],["هل تُحفظ صوري وملفاتي التي أترجمها؟","لا. تُقرأ داخل متصفحك، ولا تُرسل إلا حين تطلب التحليل أو الترجمة، وتذهب مباشرة إلى Anthropic. أما خطط الجامعات الموثّقة فمأخوذة من المواقع الرسمية، وقائمة الجامعات من قاعدة بيانات مفتوحة."]]
});
Object.assign(T.en,{
 title:"Younis | Smart study platform",
 l_t4:"Works offline after your first visit",
 webAI:"Try the full AI tutor on the Claude version",
 tutorOff:"The tutor on this site runs a text-analysis algorithm inside your browser, without sending your files to any server: upload your course file to get its key sentences and a quiz from it.",
 faqs:[["Is it free?","Yes, completely, with no ads and no sign-up."],["Where is my data kept? Can others see it?","Only in your browser on your device, and nobody else can see it. Nothing is sent to a server unless you turn on the AI tutor with your key: then what you ask it to explain or analyse goes straight to Anthropic. Download a backup from Progress to move it to another device."],["Does it work offline?","Yes. After your first visit it works without a connection, and you can install it on your phone's home screen."],["Does it work for school students?","Yes. There's a track for school and the final school year, and one for university."],["Are prayer times exact?","They're approximate astronomical calculations that can differ by a few minutes from your country's official calendar, and you can turn them off any time."],["Are the photos and files I translate kept?","No. They're read inside your browser and sent only when you ask for an analysis or translation, straight to Anthropic. Verified university plans come from the official websites, and the university list from an open dataset."]]
});
T.ar.feats=T.ar.feats.concat([
 ["عدسة يونس","صوّر مسألة أو صفحة أو مخططاً، فيحلّها خطوة بخطوة أو يشرحها أو يستخرج نصها، ويحوّلها إلى بطاقات مراجعة."],
 ["ترجمة دقيقة لملفاتك","ارفع PDF أو Word أو عرضاً أو صورة، فيُترجم كاملاً مع الحفاظ على العناوين والجداول، وتنزّله ملف Word."],
 ["جامعتي وتخصصي","اختر جامعتك من أكثر من 10 آلاف جامعة، فتظهر لك تخصصاتها، ثم مواد خطتك فقط."],
 ["طريقك إلى التخرج","علّم ما نجحت فيه، فتعرف ساعاتك المتبقية والمواد المتاحة لك في الفصل القادم."]
]);
T.en.feats=T.en.feats.concat([
 ["Younis Lens","Snap a problem, page or diagram: it solves it step by step, explains it, transcribes it, or turns it into flashcards."],
 ["Accurate file translation","Upload a PDF, Word file, slides or a photo; it is translated in full, headings and tables kept, and you can download it as Word."],
 ["My university and major","Pick your university from over 10,000, see its majors, then only the courses of your own plan."],
 ["Your road to graduation","Mark what you've passed to see the hours you have left and which courses you can take next semester."]
]);
