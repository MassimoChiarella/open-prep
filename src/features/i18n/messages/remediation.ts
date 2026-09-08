import type { PartialMessageCatalog } from "@/features/i18n/i18n";

type Translations = readonly [string, string, string, string, string, string, string, string, string];

const keys: Record<string, Translations> = {
  "Separate firm names with commas. These are reference notes and do not change your practice priorities.": [
    "Separa los nombres de las firmas con comas. Son notas de referencia y no cambian tus prioridades de práctica.",
    "Séparez les noms des cabinets par des virgules. Ces notes de référence ne modifient pas vos priorités d’entraînement.",
    "Trennen Sie Firmennamen durch Kommas. Diese Angaben dienen als Notizen und ändern Ihre Übungsprioritäten nicht.",
    "Separe os nomes das empresas por vírgulas. São notas de referência e não alteram suas prioridades de prática.",
    "请用逗号分隔公司名称。这些信息仅供参考，不会改变你的练习优先级。",
    "請用逗號分隔公司名稱。這些資訊僅供參考，不會改變你的練習優先順序。",
    "企業名はカンマで区切ってください。参考用のメモであり、練習の優先順位には影響しません。",
    "افصل أسماء الشركات بفواصل. هذه ملاحظات مرجعية ولا تغيّر أولويات تدريبك.",
    "कंपनियों के नाम अल्पविराम से अलग करें। ये संदर्भ के लिए नोट हैं और आपकी अभ्यास प्राथमिकताओं को नहीं बदलते।"
  ],
  "Local case draft": ["Borrador local del caso", "Brouillon local du cas", "Lokaler Fallentwurf", "Rascunho local do caso", "本地案例草稿", "本機案例草稿", "ケースのローカル下書き", "مسودة الحالة المحلية", "केस का स्थानीय मसौदा"],
  "Save a private draft on this device so I can resume this case.": [
    "Guardar un borrador privado en este dispositivo para poder retomar este caso.",
    "Enregistrer un brouillon privé sur cet appareil pour reprendre ce cas plus tard.",
    "Einen privaten Entwurf auf diesem Gerät speichern, damit ich diesen Fall fortsetzen kann.",
    "Salvar um rascunho privado neste dispositivo para retomar este caso depois.",
    "在此设备上保存私人草稿，以便稍后继续此案例。", "在此裝置上儲存私人草稿，以便稍後繼續此案例。",
    "このケースを再開できるように、この端末に非公開の下書きを保存する。",
    "احفظ مسودة خاصة على هذا الجهاز لأتمكن من استئناف هذه الحالة.", "इस केस को फिर से जारी रखने के लिए इस डिवाइस पर निजी मसौदा सहेजें।"
  ],
  "A saved case draft is available.": ["Hay un borrador guardado del caso.", "Un brouillon du cas est disponible.", "Ein gespeicherter Fallentwurf ist verfügbar.", "Há um rascunho salvo do caso.", "有已保存的案例草稿。", "有已儲存的案例草稿。", "保存済みのケースの下書きがあります。", "توجد مسودة محفوظة للحالة.", "केस का सहेजा गया मसौदा उपलब्ध है।"],
  "Resume draft": ["Retomar borrador", "Reprendre le brouillon", "Entwurf fortsetzen", "Retomar rascunho", "继续草稿", "繼續草稿", "下書きを再開", "استئناف المسودة", "मसौदा जारी रखें"],
  "Discard draft": ["Descartar borrador", "Supprimer le brouillon", "Entwurf verwerfen", "Descartar rascunho", "舍弃草稿", "捨棄草稿", "下書きを破棄", "حذف المسودة", "मसौदा हटाएँ"],
  "The saved draft uses different case content or is invalid. Discard it to save a new draft.": [
    "El borrador guardado usa otro contenido del caso o no es válido. Descártalo para guardar uno nuevo.",
    "Le brouillon enregistré utilise un contenu de cas différent ou est invalide. Supprimez-le pour en enregistrer un nouveau.",
    "Der gespeicherte Entwurf verwendet andere Fallinhalte oder ist ungültig. Verwerfen Sie ihn, um einen neuen Entwurf zu speichern.",
    "O rascunho salvo usa outro conteúdo de caso ou é inválido. Descarte-o para salvar um novo rascunho.",
    "已保存的草稿使用不同的案例内容或已无效。请舍弃它以保存新草稿。", "已儲存的草稿使用不同的案例內容或已無效。請捨棄它以儲存新草稿。",
    "保存された下書きはケースの内容が異なるか、無効です。破棄すると新しい下書きを保存できます。",
    "تستخدم المسودة المحفوظة محتوى حالة مختلفًا أو أنها غير صالحة. احذفها لحفظ مسودة جديدة.",
    "सहेजे गए मसौदे में केस की सामग्री अलग है या वह अमान्य है। नया मसौदा सहेजने के लिए इसे हटाएँ।"
  ],
  "Private draft saved on this device.": ["Borrador privado guardado en este dispositivo.", "Brouillon privé enregistré sur cet appareil.", "Privater Entwurf auf diesem Gerät gespeichert.", "Rascunho privado salvo neste dispositivo.", "私人草稿已保存在此设备上。", "私人草稿已儲存在此裝置上。", "非公開の下書きをこの端末に保存しました。", "تم حفظ المسودة الخاصة على هذا الجهاز.", "इस डिवाइस पर निजी मसौदा सहेजा गया।"],
  "The local draft could not be read or updated. Keep this page open to preserve your current work.": [
    "No se pudo leer ni actualizar el borrador local. Mantén esta página abierta para conservar tu trabajo actual.",
    "Le brouillon local n’a pas pu être lu ou mis à jour. Gardez cette page ouverte pour conserver votre travail en cours.",
    "Der lokale Entwurf konnte nicht gelesen oder aktualisiert werden. Lassen Sie diese Seite geöffnet, um Ihre aktuelle Arbeit zu behalten.",
    "Não foi possível ler ou atualizar o rascunho local. Mantenha esta página aberta para preservar seu trabalho atual.",
    "无法读取或更新本地草稿。请保持此页面打开，以保留当前内容。", "無法讀取或更新本機草稿。請保持此頁面開啟，以保留目前內容。",
    "ローカルの下書きを読み込むか更新することができませんでした。現在の作業を保持するため、このページを開いたままにしてください。",
    "تعذرت قراءة المسودة المحلية أو تحديثها. أبقِ هذه الصفحة مفتوحة للحفاظ على عملك الحالي.",
    "स्थानीय मसौदा पढ़ा या अपडेट नहीं किया जा सका। अपना वर्तमान काम सुरक्षित रखने के लिए यह पेज खुला रखें।"
  ],
  "Retry local save": ["Reintentar guardado local", "Réessayer l’enregistrement local", "Lokales Speichern erneut versuchen", "Tentar salvar localmente de novo", "重试本地保存", "重試本機儲存", "ローカル保存を再試行", "إعادة محاولة الحفظ المحلي", "स्थानीय रूप से सहेजने का फिर प्रयास करें"],
  "Exports practice progress only. Private stories, preparation profiles, full-case drafts, notes, preferences, and installed packs are excluded.": [
    "Exporta solo el progreso de práctica. Excluye historias privadas, perfiles de preparación, borradores de casos completos, notas, preferencias y paquetes instalados.",
    "Exporte uniquement la progression des exercices. Les récits privés, profils de préparation, brouillons de cas complets, notes, préférences et packs installés sont exclus.",
    "Exportiert nur den Übungsfortschritt. Private Beispiele, Vorbereitungsprofile, vollständige Fallentwürfe, Notizen, Einstellungen und installierte Pakete sind ausgeschlossen.",
    "Exporta apenas o progresso de prática. Histórias privadas, perfis de preparação, rascunhos de casos completos, notas, preferências e pacotes instalados ficam de fora.",
    "仅导出练习进度。不包括私人故事、备考资料、完整案例草稿、笔记、偏好设置和已安装的题包。",
    "僅匯出練習進度。不包括私人故事、備考資料、完整案例草稿、筆記、偏好設定和已安裝的題庫包。",
    "練習の進捗のみをエクスポートします。非公開のエピソード、準備プロフィール、総合ケースの下書き、メモ、設定、インストール済みパックは含まれません。",
    "يُصدّر تقدّم التدريب فقط. لا يشمل القصص الخاصة وملفات التحضير ومسودات الحالات الكاملة والملاحظات والتفضيلات والحزم المثبتة.",
    "केवल अभ्यास की प्रगति निर्यात करता है। निजी कहानियाँ, तैयारी प्रोफ़ाइल, पूरे केस के मसौदे, नोट, प्राथमिकताएँ और इंस्टॉल किए गए पैक शामिल नहीं हैं।"
  ],
  "Include private stories, preparation profile, full-case drafts, and notes": [
    "Incluir historias privadas, perfil de preparación, borradores de casos completos y notas", "Inclure les récits privés, le profil de préparation, les brouillons de cas complets et les notes",
    "Private Beispiele, Vorbereitungsprofil, vollständige Fallentwürfe und Notizen einschließen", "Incluir histórias privadas, perfil de preparação, rascunhos de casos completos e notas",
    "包括私人故事、备考资料、完整案例草稿和笔记", "包括私人故事、備考資料、完整案例草稿和筆記",
    "非公開のエピソード、準備プロフィール、総合ケースの下書き、メモを含める", "تضمين القصص الخاصة وملف التحضير ومسودات الحالات الكاملة والملاحظات", "निजी कहानियाँ, तैयारी प्रोफ़ाइल, पूरे केस के मसौदे और नोट शामिल करें"
  ],
  "Download every numbered part. Select all parts together when restoring this backup.": [
    "Descarga cada parte numerada. Selecciona todas las partes juntas al restaurar esta copia de seguridad.", "Téléchargez chaque partie numérotée. Sélectionnez toutes les parties ensemble pour restaurer cette sauvegarde.",
    "Laden Sie alle nummerierten Teile herunter. Wählen Sie beim Wiederherstellen dieser Sicherung alle Teile zusammen aus.", "Baixe todas as partes numeradas. Selecione todas juntas ao restaurar este backup.",
    "下载所有编号分卷。恢复此备份时，请同时选择全部分卷。", "下載所有編號分卷。還原此備份時，請同時選取全部分卷。",
    "番号付きのファイルをすべてダウンロードしてください。復元時はすべてのファイルをまとめて選択してください。", "نزّل جميع الأجزاء المرقمة. حددها كلها معًا عند استعادة هذه النسخة الاحتياطية.", "हर क्रमांकित भाग डाउनलोड करें। इस बैकअप को बहाल करते समय सभी भाग एक साथ चुनें।"
  ],
  "Download Part {part} of {count}": ["Descargar parte {part} de {count}", "Télécharger la partie {part} sur {count}", "Teil {part} von {count} herunterladen", "Baixar parte {part} de {count}", "下载第 {part} 部分，共 {count} 部分", "下載第 {part} 部分，共 {count} 部分", "全{count}個中の{part}個目をダウンロード", "تنزيل الجزء {part} من {count}", "{count} में से भाग {part} डाउनलोड करें"],
  Downloaded: ["Descargado", "Téléchargé", "Heruntergeladen", "Baixado", "已下载", "已下載", "ダウンロード済み", "تم التنزيل", "डाउनलोड हो गया"],
  "Large backups use numbered files. A complete set supports up to 64 files and 128 MiB.": [
    "Las copias grandes usan archivos numerados. Un conjunto completo admite hasta 64 archivos y 128 MiB.", "Les sauvegardes volumineuses utilisent des fichiers numérotés. Un ensemble complet accepte jusqu’à 64 fichiers et 128 MiB.",
    "Große Sicherungen verwenden nummerierte Dateien. Ein vollständiger Satz unterstützt bis zu 64 Dateien und 128 MiB.", "Backups grandes usam arquivos numerados. Um conjunto completo aceita até 64 arquivos e 128 MiB.",
    "大型备份使用编号文件。完整备份集最多支持 64 个文件和 128 MiB。", "大型備份使用編號檔案。完整備份組最多支援 64 個檔案和 128 MiB。",
    "大きなバックアップは番号付きファイルに分割されます。1セットは最大64ファイル、合計128 MiBまでです。", "تستخدم النسخ الاحتياطية الكبيرة ملفات مرقمة. تدعم المجموعة الكاملة حتى 64 ملفًا وبحجم 128 MiB.", "बड़े बैकअप क्रमांकित फ़ाइलों में होते हैं। पूरे सेट में अधिकतम 64 फ़ाइलें और 128 MiB हो सकते हैं।"
  ],
  "For a numbered backup, select every part together. Nothing is replaced until the entire set is valid.": [
    "Para una copia numerada, selecciona todas las partes juntas. No se reemplaza nada hasta que el conjunto completo sea válido.", "Pour une sauvegarde numérotée, sélectionnez toutes les parties ensemble. Rien n’est remplacé avant la validation de l’ensemble.",
    "Wählen Sie bei einer nummerierten Sicherung alle Teile zusammen aus. Erst wenn der gesamte Satz gültig ist, werden Daten ersetzt.", "Para um backup numerado, selecione todas as partes juntas. Nada é substituído até que o conjunto inteiro seja válido.",
    "对于编号备份，请同时选择全部分卷。在整个备份集验证有效之前，不会替换任何数据。", "對於編號備份，請同時選取全部分卷。在整個備份組驗證有效之前，不會取代任何資料。",
    "番号付きのバックアップはすべてのファイルをまとめて選択してください。セット全体の有効性が確認されるまで、データは置き換えられません。",
    "للنسخ الاحتياطية المرقمة، حدد جميع الأجزاء معًا. لن يُستبدل شيء حتى يتم التحقق من صلاحية المجموعة كاملة.", "क्रमांकित बैकअप के लिए सभी भाग एक साथ चुनें। पूरा सेट मान्य होने तक कुछ भी बदला नहीं जाएगा।"
  ],
  "If Standard Progress Export exceeds its limits, use Complete Backup to export the full history in numbered files.": [
    "Si la exportación estándar de progreso supera sus límites, usa la copia de seguridad completa para exportar todo el historial en archivos numerados.",
    "Si l’export standard de progression dépasse ses limites, utilisez la sauvegarde complète pour exporter tout l’historique dans des fichiers numérotés.",
    "Wenn der Standardexport des Fortschritts seine Grenzen überschreitet, exportieren Sie den gesamten Verlauf mit der vollständigen Sicherung in nummerierten Dateien.",
    "Se a exportação padrão de progresso exceder os limites, use o backup completo para exportar todo o histórico em arquivos numerados.",
    "如果标准进度导出超出限制，请使用完整备份，将全部历史记录导出为编号文件。", "如果標準進度匯出超出限制，請使用完整備份，將全部歷史記錄匯出為編號檔案。",
    "標準の進捗エクスポートが上限を超える場合は、完全バックアップを使い、全履歴を番号付きファイルにエクスポートしてください。",
    "إذا تجاوز تصدير التقدّم القياسي حدوده، فاستخدم النسخ الاحتياطي الكامل لتصدير السجل بأكمله في ملفات مرقمة.",
    "यदि प्रगति का मानक निर्यात सीमा से अधिक हो, तो पूरे इतिहास को क्रमांकित फ़ाइलों में निर्यात करने के लिए पूर्ण बैकअप का उपयोग करें।"
  ],
  "This removes saved Fit/PEI stories, preparation profiles, full-case drafts, and market-sizing note text. Practice attempts, scores, installed packs, and preferences remain.": [
    "Esto elimina historias Fit/PEI guardadas, perfiles de preparación, borradores de casos completos y notas de estimación de mercados. Se conservan los intentos, puntuaciones, paquetes instalados y preferencias.",
    "Cela supprime les récits Fit/PEI, profils de préparation, brouillons de cas complets et notes de dimensionnement de marché. Les tentatives, scores, packs installés et préférences sont conservés.",
    "Dies entfernt gespeicherte Fit/PEI-Beispiele, Vorbereitungsprofile, vollständige Fallentwürfe und Marktgrößen-Notizen. Übungsversuche, Punktzahlen, installierte Pakete und Einstellungen bleiben erhalten.",
    "Isso remove histórias Fit/PEI salvas, perfis de preparação, rascunhos de casos completos e notas de dimensionamento de mercado. Tentativas, pontuações, pacotes instalados e preferências são mantidos.",
    "这将删除已保存的 Fit/PEI 故事、备考资料、完整案例草稿和市场规模估算笔记。练习记录、分数、已安装的题包和偏好设置将保留。",
    "這將刪除已儲存的 Fit/PEI 故事、備考資料、完整案例草稿和市場規模估算筆記。練習記錄、分數、已安裝的題庫包和偏好設定將保留。",
    "保存済みのFit/PEIエピソード、準備プロフィール、総合ケースの下書き、市場規模推定のメモを削除します。練習記録、スコア、インストール済みパック、設定は保持されます。",
    "يؤدي هذا إلى حذف قصص Fit/PEI المحفوظة وملفات التحضير ومسودات الحالات الكاملة ونصوص ملاحظات تقدير حجم السوق. تبقى محاولات التدريب والدرجات والحزم المثبتة والتفضيلات.",
    "इससे सहेजी गई Fit/PEI कहानियाँ, तैयारी प्रोफ़ाइल, पूरे केस के मसौदे और बाज़ार आकार के नोट हट जाते हैं। अभ्यास प्रयास, स्कोर, इंस्टॉल किए गए पैक और प्राथमिकताएँ बनी रहती हैं।"
  ],
  "Full-case drafts": ["Borradores de casos completos", "Brouillons de cas complets", "Vollständige Fallentwürfe", "Rascunhos de casos completos", "完整案例草稿", "完整案例草稿", "総合ケースの下書き", "مسودات الحالات الكاملة", "पूरे केस के मसौदे"],
  "Use only one answer unit.": ["Usa solo una unidad en la respuesta.", "Utilisez une seule unité dans la réponse.", "Verwenden Sie nur eine Antworteinheit.", "Use apenas uma unidade na resposta.", "答案只能使用一种单位。", "答案只能使用一種單位。", "回答の単位は1つだけ使用してください。", "استخدم وحدة واحدة فقط للإجابة.", "उत्तर में केवल एक इकाई का उपयोग करें।"],
  "Select at most 64 backup files, no larger than 40 MiB each or 128 MiB together.": [
    "Selecciona como máximo 64 archivos de copia de seguridad, de hasta 40 MiB cada uno y 128 MiB en total.", "Sélectionnez au plus 64 fichiers de sauvegarde, de 40 MiB maximum chacun et de 128 MiB au total.",
    "Wählen Sie höchstens 64 Sicherungsdateien mit jeweils maximal 40 MiB und insgesamt maximal 128 MiB aus.", "Selecione no máximo 64 arquivos de backup, com até 40 MiB cada e 128 MiB no total.",
    "最多选择 64 个备份文件，每个不超过 40 MiB，总计不超过 128 MiB。", "最多選取 64 個備份檔案，每個不超過 40 MiB，總計不超過 128 MiB。",
    "バックアップファイルは最大64個、各40 MiB以下、合計128 MiB以下で選択してください。", "حدد 64 ملف نسخ احتياطي كحد أقصى، بحجم لا يتجاوز 40 MiB لكل ملف و128 MiB إجمالًا.", "अधिकतम 64 बैकअप फ़ाइलें चुनें, प्रत्येक 40 MiB और सभी मिलकर 128 MiB से अधिक न हों।"
  ],
  "Select one complete backup, or every numbered part of one backup set.": [
    "Selecciona una copia de seguridad completa o todas las partes numeradas de un mismo conjunto.", "Sélectionnez une sauvegarde complète ou toutes les parties numérotées d’un même ensemble.",
    "Wählen Sie eine vollständige Sicherung oder alle nummerierten Teile eines Sicherungssatzes aus.", "Selecione um backup completo ou todas as partes numeradas de um mesmo conjunto.",
    "请选择一个完整备份，或同一备份集的所有编号分卷。", "請選取一個完整備份，或同一備份組的所有編號分卷。",
    "完全バックアップ1つ、または同じバックアップセットの番号付きファイルをすべて選択してください。", "حدد نسخة احتياطية كاملة واحدة، أو جميع الأجزاء المرقمة لمجموعة واحدة.", "एक पूर्ण बैकअप या एक ही बैकअप सेट के सभी क्रमांकित भाग चुनें।"
  ],
  "Backup part metadata is invalid.": ["Los metadatos de la parte de la copia de seguridad no son válidos.", "Les métadonnées de la partie de sauvegarde sont invalides.", "Die Metadaten des Sicherungsteils sind ungültig.", "Os metadados da parte do backup são inválidos.", "备份分卷的元数据无效。", "備份分卷的中繼資料無效。", "バックアップファイルのメタデータが無効です。", "البيانات الوصفية لجزء النسخة الاحتياطية غير صالحة.", "बैकअप भाग का मेटाडेटा अमान्य है।"],
  "Backup part checksum does not match its contents.": ["La suma de verificación de la parte no coincide con su contenido.", "La somme de contrôle de la partie de sauvegarde ne correspond pas à son contenu.", "Die Prüfsumme des Sicherungsteils stimmt nicht mit seinem Inhalt überein.", "A soma de verificação da parte do backup não corresponde ao conteúdo.", "备份分卷的校验和与其内容不符。", "備份分卷的校驗碼與其內容不符。", "バックアップファイルのチェックサムが内容と一致しません。", "لا يتطابق المجموع الاختباري لجزء النسخة الاحتياطية مع محتواه.", "बैकअप भाग का चेकसम उसकी सामग्री से मेल नहीं खाता।"],
  "Select every numbered part from the same backup set exactly once.": [
    "Selecciona cada parte numerada del mismo conjunto de copia de seguridad exactamente una vez.", "Sélectionnez chaque partie numérotée du même ensemble de sauvegarde exactement une fois.",
    "Wählen Sie jeden nummerierten Teil desselben Sicherungssatzes genau einmal aus.", "Selecione cada parte numerada do mesmo conjunto de backup exatamente uma vez.",
    "请将同一备份集的每个编号分卷各选一次。", "請將同一備份組的每個編號分卷各選一次。",
    "同じバックアップセットの各番号付きファイルを1回ずつ選択してください。", "حدد كل جزء مرقم من مجموعة النسخ الاحتياطي نفسها مرة واحدة فقط.", "एक ही बैकअप सेट के हर क्रमांकित भाग को ठीक एक बार चुनें।"
  ],
  "Backup parts do not match their set identifier.": ["Las partes de la copia de seguridad no coinciden con el identificador del conjunto.", "Les parties de sauvegarde ne correspondent pas à l’identifiant de leur ensemble.", "Die Sicherungsteile stimmen nicht mit ihrer Satzkennung überein.", "As partes do backup não correspondem ao identificador do conjunto.", "备份分卷与其备份集标识符不匹配。", "備份分卷與其備份組識別碼不相符。", "バックアップファイルがセット識別子と一致しません。", "لا تتطابق أجزاء النسخة الاحتياطية مع معرّف مجموعتها.", "बैकअप के भाग अपने सेट पहचानकर्ता से मेल नहीं खाते।"],
  "Complete backup set is invalid.": ["El conjunto de copia de seguridad completa no es válido.", "L’ensemble de sauvegarde complète est invalide.", "Der vollständige Sicherungssatz ist ungültig.", "O conjunto de backup completo é inválido.", "完整备份集无效。", "完整備份組無效。", "完全バックアップのセットが無効です。", "مجموعة النسخ الاحتياطي الكامل غير صالحة.", "पूर्ण बैकअप सेट अमान्य है।"],
  "A backup record exceeds the 40 MiB file limit.": ["Un registro de la copia de seguridad supera el límite de 40 MiB por archivo.", "Un enregistrement de sauvegarde dépasse la limite de 40 MiB par fichier.", "Ein Sicherungsdatensatz überschreitet die Dateigrenze von 40 MiB.", "Um registro do backup excede o limite de 40 MiB por arquivo.", "一条备份记录超过了 40 MiB 的文件限制。", "一筆備份記錄超過了 40 MiB 的檔案限制。", "バックアップのレコードがファイル上限の40 MiBを超えています。", "يتجاوز أحد سجلات النسخة الاحتياطية حد الملف البالغ 40 MiB.", "बैकअप का एक रिकॉर्ड 40 MiB की फ़ाइल सीमा से अधिक है।"],
  "Complete backups support up to 64 files and 128 MiB per set. Keep existing backups before removing any history or large installed packs.": [
    "Las copias completas admiten hasta 64 archivos y 128 MiB por conjunto. Conserva las copias existentes antes de eliminar historial o paquetes instalados grandes.",
    "Les sauvegardes complètes acceptent jusqu’à 64 fichiers et 128 MiB par ensemble. Conservez les sauvegardes existantes avant de supprimer de l’historique ou de gros packs installés.",
    "Vollständige Sicherungen unterstützen bis zu 64 Dateien und 128 MiB pro Satz. Bewahren Sie bestehende Sicherungen auf, bevor Sie Verlaufseinträge oder große installierte Pakete entfernen.",
    "Backups completos aceitam até 64 arquivos e 128 MiB por conjunto. Preserve os backups existentes antes de remover histórico ou pacotes instalados grandes.",
    "每个完整备份集最多支持 64 个文件和 128 MiB。在删除任何历史记录或大型已安装题包之前，请保留现有备份。",
    "每個完整備份組最多支援 64 個檔案和 128 MiB。在刪除任何歷史記錄或大型已安裝題庫包之前，請保留現有備份。",
    "完全バックアップは1セット最大64ファイル、合計128 MiBまでです。履歴や大きなインストール済みパックを削除する前に、既存のバックアップを保管してください。",
    "تدعم النسخ الاحتياطية الكاملة حتى 64 ملفًا و128 MiB لكل مجموعة. احتفظ بالنسخ الاحتياطية الحالية قبل حذف أي سجل أو حزم كبيرة مثبتة.",
    "पूर्ण बैकअप के हर सेट में अधिकतम 64 फ़ाइलें और 128 MiB हो सकते हैं। कोई इतिहास या बड़ा इंस्टॉल किया गया पैक हटाने से पहले मौजूदा बैकअप सुरक्षित रखें।"
  ],
  "Complete backup must be 41943040 bytes or smaller.": ["La copia de seguridad completa debe tener como máximo 41943040 bytes.", "La sauvegarde complète ne doit pas dépasser 41943040 octets.", "Die vollständige Sicherung darf höchstens 41943040 Bytes groß sein.", "O backup completo deve ter no máximo 41943040 bytes.", "完整备份不得超过 41943040 字节。", "完整備份不得超過 41943040 位元組。", "完全バックアップは41943040バイト以下にしてください。", "يجب ألا يتجاوز حجم النسخة الاحتياطية الكاملة 41943040 بايت.", "पूर्ण बैकअप 41943040 बाइट या उससे छोटा होना चाहिए।"]
};

const storeNames = ["drill_sessions", "responses", "benchmark_results", "user_settings", "market_sizing_attempts", "exhibit_attempts", "mistake_notebook", "retry_schedules", "practice_records", "question_packs"];
for (const store of storeNames) {
  keys[`Backup parts contain duplicate records in "${store}".`] = [
    `Las partes de la copia de seguridad contienen registros duplicados en «${store}».`,
    `Les parties de sauvegarde contiennent des enregistrements en double dans « ${store} ».`,
    `Die Sicherungsteile enthalten doppelte Datensätze in „${store}“.`,
    `As partes do backup contêm registros duplicados em “${store}”.`,
    `备份分卷在“${store}”中包含重复记录。`, `備份分卷在「${store}」中包含重複記錄。`,
    `バックアップファイルの「${store}」に重複するレコードがあります。`,
    `تحتوي أجزاء النسخة الاحتياطية على سجلات مكررة في «${store}».`,
    `बैकअप के भागों में “${store}” में डुप्लिकेट रिकॉर्ड हैं।`
  ];
}

const localeOrder = ["es", "fr", "de", "pt", "zh-Hans", "zh-Hant", "ja", "ar", "hi"] as const;
export const remediationMessages = {
  en: Object.fromEntries(Object.keys(keys).map((key) => [key, key])),
  ...Object.fromEntries(localeOrder.map((locale, index) => [locale, Object.fromEntries(Object.entries(keys).map(([key, values]) => [key, values[index]]))]))
} satisfies PartialMessageCatalog;

// Includes error feedback and checkbox labels passed to t() through variables.
export const remediationDynamicKeys = Object.keys(keys);
