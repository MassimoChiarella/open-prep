import type { PartialMessageCatalog } from "@/features/i18n/i18n";

type Translations = readonly [string, string, string, string, string, string, string, string, string];

const keys: Record<string, Translations> = {
  "Checking backup files...": ["Comprobando archivos de copia de seguridad...", "Vérification des fichiers de sauvegarde…", "Sicherungsdateien werden geprüft…", "Verificando arquivos de backup...", "正在检查备份文件…", "正在檢查備份檔案…", "バックアップファイルを確認中…", "جارٍ التحقق من ملفات النسخة الاحتياطية...", "बैकअप फ़ाइलों की जाँच हो रही है..."],
  "The private draft changed or was deleted in another tab. Your current work remains here. Reload to review the saved draft before saving again.": [
    "El borrador privado cambió o se eliminó en otra pestaña. Tu trabajo actual sigue aquí. Recarga para revisar el borrador guardado antes de volver a guardar.",
    "Le brouillon privé a été modifié ou supprimé dans un autre onglet. Votre travail actuel reste ici. Rechargez pour vérifier le brouillon enregistré avant de sauvegarder à nouveau.",
    "Der private Entwurf wurde in einem anderen Tab geändert oder gelöscht. Ihre aktuelle Arbeit bleibt hier. Laden Sie neu, um den gespeicherten Entwurf vor dem erneuten Speichern zu prüfen.",
    "O rascunho privado foi alterado ou excluído em outra aba. Seu trabalho atual permanece aqui. Recarregue para revisar o rascunho salvo antes de salvar novamente.",
    "私密草稿已在另一个标签页中更改或删除。当前内容仍保留在此页面。请重新加载并查看已保存的草稿，然后再保存。",
    "私人草稿已在另一個分頁中變更或刪除。目前內容仍保留在此頁面。請重新載入並檢查已儲存的草稿，然後再儲存。",
    "非公開の下書きが別のタブで変更または削除されました。現在の作業はこのページに残っています。再読み込みして保存済みの下書きを確認してから保存してください。",
    "تغيرت المسودة الخاصة أو حُذفت في علامة تبويب أخرى. يبقى عملك الحالي هنا. أعد التحميل لمراجعة المسودة المحفوظة قبل الحفظ مجددًا.",
    "निजी ड्राफ्ट दूसरे टैब में बदला या हटाया गया है। आपका वर्तमान काम यहाँ मौजूद है। दोबारा सहेजने से पहले पेज री लोड करके सहेजा गया ड्राफ्ट देखें।"
  ],
  "Use 100,000 characters or fewer for target firms.": [
    "Usa un máximo de 100.000 caracteres para las empresas objetivo.", "Utilisez au maximum 100 000 caractères pour les cabinets visés.",
    "Verwenden Sie höchstens 100.000 Zeichen für die Zielfirmen.", "Use no máximo 100.000 caracteres para as empresas-alvo.",
    "目标公司请使用不超过 100,000 个字符。", "目標公司請使用不超過 100,000 個字元。", "志望企業は100,000文字以内で入力してください。",
    "استخدم ١٠٠٬٠٠٠ حرف أو أقل للشركات المستهدفة.", "लक्षित कंपनियों के लिए 100,000 या उससे कम वर्णों का उपयोग करें।"
  ],
  "Saved data was replaced or cleared. Reload this page before reviewing recovery.": [
    "Los datos guardados se reemplazaron o borraron. Recarga esta página antes de revisar la recuperación.", "Les données enregistrées ont été remplacées ou effacées. Rechargez cette page avant d’examiner la récupération.",
    "Gespeicherte Daten wurden ersetzt oder gelöscht. Laden Sie diese Seite neu, bevor Sie die Wiederherstellung prüfen.", "Os dados salvos foram substituídos ou apagados. Recarregue esta página antes de revisar a recuperação.",
    "已保存的数据已被替换或清除。查看修复方案前，请重新加载此页面。", "已儲存的資料已被取代或清除。檢視修復方案前，請重新載入此頁面。", "保存済みのデータが置き換えまたは消去されました。修復内容を確認する前にページを再読み込みしてください。",
    "تم استبدال البيانات المحفوظة أو مسحها. أعد تحميل هذه الصفحة قبل مراجعة الإصلاح.", "सहेजा गया डेटा बदला या साफ़ किया गया है। सुधार की समीक्षा से पहले यह पृष्ठ फिर से लोड करें।"
  ],
  "Reload page": ["Recargar página", "Recharger la page", "Seite neu laden", "Recarregar página", "重新加载页面", "重新載入頁面", "ページを再読み込み", "إعادة تحميل الصفحة", "पृष्ठ फिर से लोड करें"],
  "Saved data is incompatible with backups. Review individual records in recovery.": [
    "Los datos guardados son incompatibles con las copias. Revisa los registros individuales en la sección de recuperación.", "Les données enregistrées sont incompatibles avec les sauvegardes. Examinez les enregistrements dans la section de récupération.",
    "Gespeicherte Daten sind mit Sicherungen inkompatibel. Prüfen Sie einzelne Datensätze im Wiederherstellungsbereich.", "Os dados salvos são incompatíveis com backups. Revise os registros individuais na seção de recuperação.",
    "已保存的数据与备份不兼容。请在修复区域查看单条记录。", "已儲存的資料與備份不相容。請在修復區域檢視個別紀錄。", "保存済みのデータはバックアップに対応していません。修復欄で個別の記録を確認してください。",
    "البيانات المحفوظة غير متوافقة مع النسخ الاحتياطية. راجع السجلات المنفردة في قسم الإصلاح.", "सहेजा गया डेटा बैकअप के अनुकूल नहीं है। सुधार अनुभाग में अलग-अलग रिकॉर्ड की समीक्षा करें।"
  ],
  "This record's ownership could not be verified. Automatic removal is unavailable.": [
    "No se pudo verificar a qué intento pertenece este registro. La eliminación automática no está disponible.", "L’appartenance de cet enregistrement n’a pas pu être vérifiée. La suppression automatique n’est pas disponible.",
    "Die Zuordnung dieses Datensatzes konnte nicht bestätigt werden. Eine automatische Entfernung ist nicht verfügbar.", "Não foi possível verificar a qual tentativa este registro pertence. A remoção automática não está disponível.",
    "无法确认此记录的归属，不能自动删除。", "無法確認此紀錄的歸屬，不能自動刪除。", "この記録の所属を確認できませんでした。自動削除は利用できません。",
    "تعذّر التحقق من تبعية هذا السجل. الإزالة التلقائية غير متاحة.", "इस रिकॉर्ड का स्वामित्व सत्यापित नहीं हो सका। अपने आप हटाना उपलब्ध नहीं है।"
  ],
  "Local data changed. Reload before saving new work.": [
    "Los datos locales cambiaron. Recarga antes de guardar trabajo nuevo.", "Les données locales ont changé. Rechargez la page avant d’enregistrer un nouveau travail.",
    "Lokale Daten wurden geändert. Laden Sie die Seite neu, bevor Sie neue Arbeit speichern.", "Os dados locais mudaram. Recarregue antes de salvar novo trabalho.",
    "本地数据已更改。保存新内容前，请重新加载页面。", "本機資料已變更。儲存新內容前，請重新載入頁面。", "ローカルデータが変更されました。新しい内容を保存する前に再読み込みしてください。",
    "تغيّرت البيانات المحلية. أعد التحميل قبل حفظ عمل جديد.", "स्थानीय डेटा बदल गया है। नया काम सहेजने से पहले पृष्ठ फिर से लोड करें।"
  ],
  "This attempt changed in another tab. Review the saved attempt or keep your work separately.": [
    "Este intento cambió en otra pestaña. Revisa el intento guardado o conserva tu trabajo por separado.", "Cette tentative a changé dans un autre onglet. Examinez la tentative enregistrée ou conservez votre travail séparément.",
    "Dieser Versuch wurde in einem anderen Tab geändert. Prüfen Sie den gespeicherten Versuch oder behalten Sie Ihre Arbeit separat.", "Esta tentativa mudou em outra aba. Revise a tentativa salva ou mantenha seu trabalho separado.",
    "此练习已在另一个标签页中更改。请查看已保存的练习，或单独保留你的内容。", "此練習已在另一個分頁中變更。請檢視已儲存的練習，或另外保留你的內容。", "この練習は別のタブで変更されました。保存済みの練習を確認するか、自分の内容を別に保存してください。",
    "تغيّرت هذه المحاولة في علامة تبويب أخرى. راجع المحاولة المحفوظة أو احتفظ بعملك بشكل منفصل.", "यह प्रयास दूसरे टैब में बदल गया है। सहेजे गए प्रयास की समीक्षा करें या अपना काम अलग रखें।"
  ],
  "Text contains {length} code units; the backup limit is {limit}.": [
    "El texto contiene {length} unidades de código; el límite de la copia es {limit}.", "Le texte contient {length} unités de code ; la limite de sauvegarde est de {limit}.",
    "Der Text enthält {length} Codeeinheiten; die Sicherungsgrenze beträgt {limit}.", "O texto contém {length} unidades de código; o limite do backup é {limit}.",
    "文本包含 {length} 个代码单元；备份上限为 {limit}。", "文字包含 {length} 個碼元；備份上限為 {limit}。", "テキストは{length}コード単位です。バックアップの上限は{limit}です。",
    "يحتوي النص على {length} وحدة ترميز؛ حد النسخ الاحتياطي هو {limit}.", "पाठ में {length} कोड इकाइयाँ हैं; बैकअप की सीमा {limit} है।"
  ],
  "Number is not finite.": ["El número no es finito.", "Le nombre n’est pas fini.", "Die Zahl ist nicht endlich.", "O número não é finito.", "数值不是有限数。", "數值不是有限數。", "数値が有限ではありません。", "العدد ليس منتهيًا.", "संख्या परिमित नहीं है।"],
  "Value is not compatible with JSON backups.": ["El valor no es compatible con las copias JSON.", "La valeur n’est pas compatible avec les sauvegardes JSON.", "Der Wert ist mit JSON-Sicherungen nicht kompatibel.", "O valor não é compatível com backups JSON.", "此值与 JSON 备份不兼容。", "此值與 JSON 備份不相容。", "この値はJSONバックアップに対応していません。", "القيمة غير متوافقة مع نسخ JSON الاحتياطية.", "मान JSON बैकअप के अनुकूल नहीं है।"],
  "Circular references are not compatible with backups.": ["Las referencias circulares no son compatibles con las copias.", "Les références circulaires ne sont pas compatibles avec les sauvegardes.", "Zirkelverweise sind mit Sicherungen nicht kompatibel.", "Referências circulares não são compatíveis com backups.", "循环引用与备份不兼容。", "循環參照與備份不相容。", "循環参照はバックアップに対応していません。", "المراجع الدائرية غير متوافقة مع النسخ الاحتياطية.", "चक्रीय संदर्भ बैकअप के अनुकूल नहीं हैं।"],
  "Value exceeds the supported backup nesting limit.": ["El valor supera el límite de anidamiento de la copia.", "La valeur dépasse la profondeur d’imbrication prise en charge par la sauvegarde.", "Der Wert überschreitet die unterstützte Verschachtelungstiefe der Sicherung.", "O valor excede o limite de aninhamento do backup.", "此值超出备份支持的嵌套深度。", "此值超出備份支援的巢狀深度。", "値がバックアップで対応する入れ子の深さを超えています。", "تتجاوز القيمة حد التداخل المدعوم للنسخ الاحتياطي.", "मान बैकअप के समर्थित नेस्टिंग स्तर से अधिक है।"],
  "Collection exceeds the backup limit of 10,000 items.": ["La colección supera el límite de 10.000 elementos de la copia.", "La collection dépasse la limite de sauvegarde de 10 000 éléments.", "Die Sammlung überschreitet die Sicherungsgrenze von 10.000 Elementen.", "A coleção excede o limite de 10.000 itens do backup.", "集合超出备份的 10,000 项上限。", "集合超出備份的 10,000 項上限。", "コレクションがバックアップの上限10,000項目を超えています。", "تتجاوز المجموعة حد النسخ الاحتياطي البالغ ١٠٬٠٠٠ عنصر.", "संग्रह बैकअप की 10,000 आइटम की सीमा से अधिक है।"],
  "Value is not a plain backup object.": ["El valor no es un objeto simple compatible con la copia.", "La valeur n’est pas un objet simple compatible avec la sauvegarde.", "Der Wert ist kein einfaches Sicherungsobjekt.", "O valor não é um objeto simples compatível com o backup.", "此值不是备份支持的普通对象。", "此值不是備份支援的一般物件。", "値がバックアップ用の通常のオブジェクトではありません。", "القيمة ليست كائنًا بسيطًا متوافقًا مع النسخ الاحتياطي.", "मान साधारण बैकअप ऑब्जेक्ट नहीं है।"],
  "Array contains a missing value that JSON would replace with null.": [
    "La matriz contiene un valor ausente que JSON sustituiría por null.", "Le tableau contient une valeur manquante que JSON remplacerait par null.",
    "Das Array enthält einen fehlenden Wert, den JSON durch null ersetzen würde.", "A matriz contém um valor ausente que JSON substituiria por null.",
    "数组包含缺失值，JSON 会将其替换为 null。", "陣列包含遺漏值，JSON 會將其取代為 null。", "配列に欠損値があり、JSONではnullに置き換えられます。",
    "تحتوي المصفوفة على قيمة مفقودة سيستبدلها JSON بالقيمة null.", "ऐरे में अनुपस्थित मान है जिसे JSON null से बदल देगा।"
  ],
  "Property name exceeds the backup text limit.": ["El nombre de propiedad supera el límite de texto de la copia.", "Le nom de propriété dépasse la limite de texte de la sauvegarde.", "Der Eigenschaftsname überschreitet die Textgrenze der Sicherung.", "O nome da propriedade excede o limite de texto do backup.", "属性名称超出备份文本长度上限。", "屬性名稱超出備份文字長度上限。", "プロパティ名がバックアップのテキスト上限を超えています。", "يتجاوز اسم الخاصية حد النص للنسخ الاحتياطي.", "गुण का नाम बैकअप की पाठ सीमा से अधिक है।"],
  "Note has an invalid saved value.": ["La nota tiene un valor guardado no válido.", "La note contient une valeur enregistrée non valide.", "Die Notiz enthält einen ungültigen gespeicherten Wert.", "A nota tem um valor salvo inválido.", "笔记包含无效的已保存值。", "筆記包含無效的已儲存值。", "メモに保存された値が無効です。", "تحتوي الملاحظة على قيمة محفوظة غير صالحة.", "नोट में सहेजा गया मान अमान्य है।"],
  "Record has invalid or missing fields.": ["El registro tiene campos no válidos o ausentes.", "L’enregistrement comporte des champs non valides ou manquants.", "Der Datensatz enthält ungültige oder fehlende Felder.", "O registro tem campos inválidos ou ausentes.", "记录包含无效或缺失的字段。", "紀錄包含無效或遺漏的欄位。", "記録に無効または欠落した項目があります。", "يحتوي السجل على حقول غير صالحة أو مفقودة.", "रिकॉर्ड में अमान्य या अनुपस्थित फ़ील्ड हैं।"],
  "Installed pack has invalid or non-canonical saved fields.": [
    "El paquete instalado tiene campos guardados no válidos o no normalizados.", "Le pack installé comporte des champs enregistrés non valides ou non normalisés.",
    "Das installierte Paket enthält ungültige oder nicht normalisierte gespeicherte Felder.", "O pacote instalado tem campos salvos inválidos ou fora do formato padrão.",
    "已安装题包包含无效或格式不规范的已保存字段。", "已安裝題包包含無效或格式不規範的已儲存欄位。", "インストール済みのパックに無効または標準形式でない保存項目があります。",
    "تحتوي الحزمة المثبتة على حقول محفوظة غير صالحة أو غير مطابقة للصيغة المعتمدة.", "इंस्टॉल किए गए पैक में अमान्य या मानक रूप से अलग सहेजे गए फ़ील्ड हैं।"
  ],
  "The stored key is invalid. Automatic removal is unavailable for this record.": [
    "La clave guardada no es válida. Este registro no puede eliminarse automáticamente.", "La clé enregistrée est non valide. La suppression automatique n’est pas disponible pour cet enregistrement.",
    "Der gespeicherte Schlüssel ist ungültig. Dieser Datensatz kann nicht automatisch entfernt werden.", "A chave salva é inválida. A remoção automática não está disponível para este registro.",
    "存储键无效，无法自动删除此记录。", "儲存鍵無效，無法自動刪除此紀錄。", "保存されたキーが無効です。この記録は自動削除できません。",
    "المفتاح المحفوظ غير صالح. لا تتوفر الإزالة التلقائية لهذا السجل.", "सहेजी गई कुंजी अमान्य है। इस रिकॉर्ड को अपने आप हटाना उपलब्ध नहीं है।"
  ],
  "This record points to different source attempts. Automatic removal would have ambiguous ownership.": [
    "Este registro apunta a distintos intentos de origen. No está claro a cuál pertenece y no puede eliminarse automáticamente.", "Cet enregistrement renvoie à plusieurs tentatives d’origine. Son appartenance est ambiguë pour une suppression automatique.",
    "Dieser Datensatz verweist auf verschiedene Ursprungsversuche. Seine Zuordnung ist für eine automatische Entfernung nicht eindeutig.", "Este registro aponta para diferentes tentativas de origem. A remoção automática teria uma associação ambígua.",
    "此记录指向不同的来源练习，归属不明确，无法自动删除。", "此紀錄指向不同的來源練習，歸屬不明確，無法自動刪除。", "この記録は複数の元の練習を参照しています。所属が曖昧なため自動削除できません。",
    "يشير هذا السجل إلى محاولات مصدر مختلفة، مما يجعل تبعيته غير واضحة عند الإزالة التلقائية.", "यह रिकॉर्ड अलग-अलग मूल प्रयासों की ओर इशारा करता है। अपने आप हटाने के लिए इसका स्वामित्व स्पष्ट नहीं है।"
  ],
  "This record contains a value that cannot be archived losslessly.": [
    "Este registro contiene un valor que no puede archivarse sin pérdida.", "Cet enregistrement contient une valeur qui ne peut pas être archivée sans perte.", "Dieser Datensatz enthält einen Wert, der sich nicht verlustfrei archivieren lässt.",
    "Este registro contém um valor que não pode ser arquivado sem perda.", "此记录包含无法无损归档的值。", "此紀錄包含無法無損封存的值。", "この記録には、情報を失わずにアーカイブできない値が含まれています。",
    "يحتوي هذا السجل على قيمة لا يمكن أرشفتها دون فقدان معلومات.", "इस रिकॉर्ड में ऐसा मान है जिसे बिना जानकारी खोए संग्रहित नहीं किया जा सकता।"
  ],
  "This record type cannot be archived losslessly. No records were changed.": [
    "Este tipo de registro no puede archivarse sin pérdida. No se modificó ningún registro.", "Ce type d’enregistrement ne peut pas être archivé sans perte. Aucun enregistrement n’a été modifié.",
    "Dieser Datensatztyp lässt sich nicht verlustfrei archivieren. Es wurden keine Datensätze geändert.", "Este tipo de registro não pode ser arquivado sem perda. Nenhum registro foi alterado.",
    "此类型的记录无法无损归档。未更改任何记录。", "此類型的紀錄無法無損封存。未變更任何紀錄。", "この種類の記録は情報を失わずにアーカイブできません。記録は変更されていません。",
    "لا يمكن أرشفة هذا النوع من السجلات دون فقدان معلومات. لم تتغيّر أي سجلات.", "इस प्रकार के रिकॉर्ड को बिना जानकारी खोए संग्रहित नहीं किया जा सकता। कोई रिकॉर्ड नहीं बदला गया।"
  ],
  "Recover individual records": ["Recuperar registros individuales", "Récupérer des enregistrements individuels", "Einzelne Datensätze wiederherstellen", "Recuperar registros individuais", "修复单条记录", "修復個別紀錄", "個別の記録を修復", "إصلاح سجلات منفردة", "अलग-अलग रिकॉर्ड सुधारें"],
  "Find saved records that prevent a backup, then review one attempt at a time. Checking changes nothing.": [
    "Busca los registros que impiden crear una copia y revisa un intento a la vez. La comprobación no modifica nada.",
    "Repérez les enregistrements qui empêchent la sauvegarde, puis examinez une tentative à la fois. La vérification ne modifie rien.",
    "Suchen Sie gespeicherte Datensätze, die eine Sicherung verhindern, und prüfen Sie jeden Versuch einzeln. Die Prüfung ändert nichts.",
    "Encontre os registros que impedem o backup e revise uma tentativa por vez. A verificação não altera nada.",
    "查找导致备份失败的已保存记录，然后逐一检查练习。检查不会更改任何数据。", "找出導致備份失敗的已儲存紀錄，再逐一檢查練習。檢查不會變更任何資料。",
    "バックアップを妨げる保存済みの記録を見つけ、練習ごとに確認します。確認だけではデータは変更されません。",
    "ابحث عن السجلات المحفوظة التي تمنع النسخ الاحتياطي، ثم راجع كل محاولة على حدة. الفحص لا يغيّر أي بيانات.",
    "बैकअप रोकने वाले सहेजे गए रिकॉर्ड खोजें, फिर एक-एक प्रयास की समीक्षा करें। जाँच से कोई बदलाव नहीं होता।"
  ],
  "Checking local records...": ["Comprobando registros locales...", "Vérification des enregistrements locaux...", "Lokale Datensätze werden geprüft...", "Verificando registros locais...", "正在检查本地记录…", "正在檢查本機紀錄…", "ローカルの記録を確認中…", "جارٍ فحص السجلات المحلية...", "स्थानीय रिकॉर्ड जाँचे जा रहे हैं..."],
  "Check local records": ["Comprobar registros locales", "Vérifier les enregistrements locaux", "Lokale Datensätze prüfen", "Verificar registros locais", "检查本地记录", "檢查本機紀錄", "ローカルの記録を確認", "فحص السجلات المحلية", "स्थानीय रिकॉर्ड जाँचें"],
  "No incompatible records found.": ["No se encontraron registros incompatibles.", "Aucun enregistrement incompatible trouvé.", "Keine inkompatiblen Datensätze gefunden.", "Nenhum registro incompatível encontrado.", "未发现不兼容的记录。", "未發現不相容的紀錄。", "互換性のない記録は見つかりませんでした。", "لم يُعثر على سجلات غير متوافقة.", "कोई असंगत रिकॉर्ड नहीं मिला।"],
  "Review recovery": ["Revisar recuperación", "Examiner la récupération", "Wiederherstellung prüfen", "Revisar recuperação", "查看修复方案", "檢視修復方案", "修復内容を確認", "مراجعة الإصلاح", "सुधार की समीक्षा करें"],
  "Remove the incompatible note only": ["Eliminar solo la nota incompatible", "Supprimer uniquement la note incompatible", "Nur die inkompatible Notiz entfernen", "Remover apenas a nota incompatível", "仅删除不兼容的笔记", "僅刪除不相容的筆記", "互換性のないメモのみ削除", "إزالة الملاحظة غير المتوافقة فقط", "केवल असंगत नोट हटाएँ"],
  "Remove this attempt and its owned records": ["Eliminar este intento y sus registros asociados", "Supprimer cette tentative et les enregistrements qui lui appartiennent", "Diesen Versuch und die zugehörigen Datensätze entfernen", "Remover esta tentativa e seus registros vinculados", "删除此练习及其所属记录", "刪除此練習及其所屬紀錄", "この練習とその練習に属する記録を削除", "إزالة هذه المحاولة والسجلات التابعة لها", "यह प्रयास और इसके स्वामित्व वाले रिकॉर्ड हटाएँ"],
  "The attempt and its score will remain saved.": ["El intento y su puntuación seguirán guardados.", "La tentative et son score resteront enregistrés.", "Der Versuch und seine Punktzahl bleiben gespeichert.", "A tentativa e sua pontuação continuarão salvas.", "练习及其分数将继续保留。", "練習及其分數將繼續保留。", "練習とスコアは保存されたままになります。", "ستبقى المحاولة ودرجتها محفوظتين.", "प्रयास और उसका स्कोर सहेजे रहेंगे।"],
  "Independent later attempts and unrelated saved data will remain saved.": [
    "Los intentos posteriores independientes y los datos no relacionados seguirán guardados.", "Les tentatives ultérieures indépendantes et les données sans rapport resteront enregistrées.",
    "Unabhängige spätere Versuche und nicht zugehörige Daten bleiben gespeichert.", "Tentativas posteriores independentes e dados não relacionados continuarão salvos.",
    "后续独立练习和无关的已保存数据将继续保留。", "後續獨立練習及無關的已儲存資料將繼續保留。", "後の独立した練習や無関係の保存済みデータは残ります。",
    "ستبقى المحاولات اللاحقة المستقلة والبيانات المحفوظة غير المرتبطة بها.", "बाद के स्वतंत्र प्रयास और असंबंधित सहेजे गए डेटा सुरक्षित रहेंगे।"
  ],
  "Existing review totals cannot be reversed reliably and will remain unchanged.": [
    "Los totales de repaso existentes no pueden revertirse de forma fiable y no cambiarán.", "Les totaux de révision existants ne peuvent pas être annulés de manière fiable et resteront inchangés.",
    "Bestehende Wiederholungssummen lassen sich nicht zuverlässig rückgängig machen und bleiben unverändert.", "Os totais de revisão existentes não podem ser revertidos com segurança e permanecerão inalterados.",
    "现有复习总数无法可靠地回退，将保持不变。", "現有複習總數無法可靠地回復，將維持不變。", "既存の復習集計は確実に取り消せないため、変更されません。",
    "لا يمكن التراجع عن إجماليات المراجعة الحالية بشكل موثوق، لذا ستبقى دون تغيير.", "मौजूदा समीक्षा के कुल आँकड़े भरोसेमंद ढंग से वापस नहीं किए जा सकते, इसलिए वे नहीं बदलेंगे।"
  ],
  "The recovery archive may contain private text. It is a diagnostic file, not a restorable backup.": [
    "El archivo de recuperación puede contener texto privado. Es un archivo de diagnóstico, no una copia restaurable.", "L’archive de récupération peut contenir du texte privé. Il s’agit d’un fichier de diagnostic, pas d’une sauvegarde restaurable.",
    "Das Wiederherstellungsarchiv kann privaten Text enthalten. Es ist eine Diagnosedatei, keine wiederherstellbare Sicherung.", "O arquivo de recuperação pode conter texto privado. É um arquivo de diagnóstico, não um backup restaurável.",
    "修复归档可能包含私人文字。它是诊断文件，不能用于还原备份。", "修復封存檔可能包含私人文字。它是診斷檔案，無法用於還原備份。", "修復用アーカイブには私的な文章が含まれる場合があります。診断用ファイルであり、復元可能なバックアップではありません。",
    "قد يحتوي أرشيف الإصلاح على نص خاص. إنه ملف تشخيص، وليس نسخة احتياطية قابلة للاستعادة.", "सुधार संग्रह में निजी पाठ हो सकता है। यह जाँच के लिए फ़ाइल है, बहाल किया जा सकने वाला बैकअप नहीं।"
  ],
  "Download original-data archive": ["Descargar archivo de datos originales", "Télécharger l’archive des données d’origine", "Archiv der Originaldaten herunterladen", "Baixar arquivo dos dados originais", "下载原始数据归档", "下載原始資料封存檔", "元のデータのアーカイブをダウンロード", "تنزيل أرشيف البيانات الأصلية", "मूल डेटा का संग्रह डाउनलोड करें"],
  "Remove without an archive; I accept losing the original records.": [
    "Eliminar sin archivo; acepto perder los registros originales.", "Supprimer sans archive ; j’accepte de perdre les enregistrements d’origine.", "Ohne Archiv entfernen; ich akzeptiere den Verlust der Originaldatensätze.",
    "Remover sem arquivo; aceito perder os registros originais.", "不保留归档并删除；我接受原始记录丢失。", "不保留封存檔並刪除；我接受原始紀錄遺失。", "アーカイブを作らずに削除します。元の記録が失われることに同意します。",
    "الإزالة دون أرشيف؛ أوافق على فقدان السجلات الأصلية.", "संग्रह के बिना हटाएँ; मैं मूल रिकॉर्ड खोने के लिए सहमत हूँ।"
  ],
  "I have saved the archive or chosen to continue without it, and confirm this removal.": [
    "He guardado el archivo o he elegido continuar sin él y confirmo esta eliminación.", "J’ai enregistré l’archive ou choisi de continuer sans elle, et je confirme cette suppression.",
    "Ich habe das Archiv gespeichert oder mich entschieden, ohne es fortzufahren, und bestätige die Entfernung.", "Salvei o arquivo ou escolhi continuar sem ele e confirmo esta remoção.",
    "我已保存归档或选择不保留归档，并确认删除。", "我已儲存封存檔或選擇不保留封存檔，並確認刪除。", "アーカイブを保存したか、保存せずに続行することを選び、この削除を確認します。",
    "حفظت الأرشيف أو اخترت المتابعة دونه، وأؤكد هذه الإزالة.", "मैंने संग्रह सहेज लिया है या उसके बिना आगे बढ़ना चुना है, और इस हटाने की पुष्टि करता हूँ।"
  ],
  "Confirm scoped removal": ["Confirmar eliminación seleccionada", "Confirmer la suppression ciblée", "Gezielte Entfernung bestätigen", "Confirmar remoção selecionada", "确认删除所选记录", "確認刪除所選紀錄", "対象の削除を確認", "تأكيد إزالة العناصر المحددة", "चुने हुए रिकॉर्ड हटाने की पुष्टि करें"],
  "Saved data changed. Check the records again before confirming recovery.": [
    "Los datos guardados cambiaron. Comprueba los registros de nuevo antes de confirmar la recuperación.", "Les données enregistrées ont changé. Vérifiez à nouveau les enregistrements avant de confirmer la récupération.",
    "Gespeicherte Daten wurden geändert. Prüfen Sie die Datensätze erneut, bevor Sie die Wiederherstellung bestätigen.", "Os dados salvos mudaram. Verifique os registros novamente antes de confirmar a recuperação.",
    "已保存的数据已更改。确认修复前，请重新检查记录。", "已儲存的資料已變更。確認修復前，請重新檢查紀錄。", "保存済みのデータが変更されました。修復を確定する前に記録を再確認してください。",
    "تغيّرت البيانات المحفوظة. افحص السجلات مجددًا قبل تأكيد الإصلاح.", "सहेजा गया डेटा बदल गया है। सुधार की पुष्टि से पहले रिकॉर्ड फिर से जाँचें।"
  ],
  "Recovery could not be completed. Check the records again before retrying.": [
    "No se pudo completar la recuperación. Comprueba los registros de nuevo antes de reintentarlo.", "La récupération n’a pas pu être terminée. Vérifiez à nouveau les enregistrements avant de réessayer.",
    "Die Wiederherstellung konnte nicht abgeschlossen werden. Prüfen Sie vor einem erneuten Versuch die Datensätze nochmals.", "Não foi possível concluir a recuperação. Verifique os registros novamente antes de tentar de novo.",
    "无法完成修复。重试前，请重新检查记录。", "無法完成修復。重試前，請重新檢查紀錄。", "修復を完了できませんでした。再試行する前に記録を再確認してください。",
    "تعذّر إكمال الإصلاح. افحص السجلات مجددًا قبل إعادة المحاولة.", "सुधार पूरा नहीं हो सका। दोबारा प्रयास करने से पहले रिकॉर्ड फिर से जाँचें।"
  ],
  "The recovery archive could not be downloaded. No records were changed.": [
    "No se pudo descargar el archivo de recuperación. No se modificó ningún registro.", "L’archive de récupération n’a pas pu être téléchargée. Aucun enregistrement n’a été modifié.",
    "Das Wiederherstellungsarchiv konnte nicht heruntergeladen werden. Es wurden keine Datensätze geändert.", "Não foi possível baixar o arquivo de recuperação. Nenhum registro foi alterado.",
    "无法下载修复归档。未更改任何记录。", "無法下載修復封存檔。未變更任何紀錄。", "修復用アーカイブをダウンロードできませんでした。記録は変更されていません。",
    "تعذّر تنزيل أرشيف الإصلاح. لم تتغيّر أي سجلات.", "सुधार संग्रह डाउनलोड नहीं हो सका। कोई रिकॉर्ड नहीं बदला गया।"
  ],
  "Recovery completed. Refresh this page before preparing a new backup.": [
    "Recuperación completada. Actualiza esta página antes de preparar una nueva copia.", "Récupération terminée. Actualisez cette page avant de préparer une nouvelle sauvegarde.",
    "Wiederherstellung abgeschlossen. Laden Sie diese Seite neu, bevor Sie eine neue Sicherung vorbereiten.", "Recuperação concluída. Atualize esta página antes de preparar um novo backup.",
    "修复已完成。准备新备份前，请刷新此页面。", "修復已完成。準備新備份前，請重新整理此頁面。", "修復が完了しました。新しいバックアップを準備する前にページを再読み込みしてください。",
    "اكتمل الإصلاح. أعد تحميل هذه الصفحة قبل إعداد نسخة احتياطية جديدة.", "सुधार पूरा हुआ। नया बैकअप तैयार करने से पहले यह पृष्ठ रीफ़्रेश करें।"
  ],
  "Some saved records are incompatible with backups. Review the affected records below.": [
    "Algunos registros guardados son incompatibles con las copias de seguridad. Revisa los registros afectados abajo.", "Certains enregistrements sont incompatibles avec les sauvegardes. Examinez les enregistrements concernés ci-dessous.",
    "Einige gespeicherte Datensätze sind mit Sicherungen inkompatibel. Prüfen Sie die betroffenen Datensätze unten.", "Alguns registros salvos são incompatíveis com backups. Revise os registros afetados abaixo.",
    "部分已保存记录与备份不兼容。请在下方查看受影响的记录。", "部分已儲存紀錄與備份不相容。請在下方檢視受影響的紀錄。", "一部の保存済みの記録はバックアップに対応していません。以下で該当する記録を確認してください。",
    "بعض السجلات المحفوظة غير متوافقة مع النسخ الاحتياطية. راجع السجلات المتأثرة أدناه.", "कुछ सहेजे गए रिकॉर्ड बैकअप के अनुकूल नहीं हैं। नीचे प्रभावित रिकॉर्ड की समीक्षा करें।"
  ],
  "Review incompatible records": ["Revisar registros incompatibles", "Examiner les enregistrements incompatibles", "Inkompatible Datensätze prüfen", "Revisar registros incompatíveis", "查看不兼容的记录", "檢視不相容的紀錄", "互換性のない記録を確認", "مراجعة السجلات غير المتوافقة", "असंगत रिकॉर्ड की समीक्षा करें"],
  "This attempt changed in another tab. Your answers are still here. Choose which attempt to keep working with.": [
    "Este intento cambió en otra pestaña. Tus respuestas siguen aquí. Elige con qué intento quieres continuar.",
    "Cette tentative a été modifiée dans un autre onglet. Vos réponses sont toujours ici. Choisissez la tentative à poursuivre.",
    "Dieser Versuch wurde in einem anderen Tab geändert. Ihre Antworten sind noch hier. Wählen Sie, mit welchem Versuch Sie fortfahren möchten.",
    "Esta tentativa mudou em outra aba. Suas respostas continuam aqui. Escolha com qual tentativa deseja continuar.",
    "此练习记录已在另一个标签页中更改。你的答案仍保留在这里。请选择要继续的练习记录。",
    "此練習紀錄已在另一個分頁中變更。你的答案仍保留在這裡。請選擇要繼續的練習紀錄。",
    "この練習は別のタブで変更されました。入力した回答はここに残っています。どちらの練習を続けるか選んでください。",
    "تغيّرت هذه المحاولة في علامة تبويب أخرى. لا تزال إجاباتك هنا. اختر المحاولة التي تريد مواصلتها.",
    "यह प्रयास दूसरे टैब में बदल गया है। आपके उत्तर अभी भी यहाँ हैं। चुनें कि किस प्रयास को जारी रखना है।"
  ],
  "View saved attempt": ["Ver intento guardado", "Voir la tentative enregistrée", "Gespeicherten Versuch anzeigen", "Ver tentativa salva", "查看已保存的练习记录", "查看已儲存的練習紀錄", "保存済みの練習を表示", "عرض المحاولة المحفوظة", "सहेजा गया प्रयास देखें"],
  "Keep my answers as a separate attempt": ["Conservar mis respuestas como un intento separado", "Conserver mes réponses dans une tentative distincte", "Meine Antworten als separaten Versuch behalten", "Manter minhas respostas como uma tentativa separada", "将我的答案保留为单独的练习记录", "將我的答案保留為獨立的練習紀錄", "自分の回答を別の練習として保持", "الاحتفاظ بإجاباتي كمحاولة منفصلة", "मेरे उत्तर अलग प्रयास के रूप में रखें"],
  "The saved attempt is unavailable or could not be loaded. Your local answers are still here.": [
    "El intento guardado no está disponible o no se pudo cargar. Tus respuestas locales siguen aquí.",
    "La tentative enregistrée est indisponible ou n’a pas pu être chargée. Vos réponses locales sont toujours ici.",
    "Der gespeicherte Versuch ist nicht verfügbar oder konnte nicht geladen werden. Ihre lokalen Antworten sind noch hier.",
    "A tentativa salva não está disponível ou não pôde ser carregada. Suas respostas locais continuam aqui.",
    "已保存的练习记录不可用或无法加载。你的本地答案仍保留在这里。", "已儲存的練習紀錄無法使用或載入。你的本機答案仍保留在這裡。",
    "保存済みの練習が見つからないか、読み込めませんでした。ローカルの回答はここに残っています。",
    "المحاولة المحفوظة غير متاحة أو تعذّر تحميلها. لا تزال إجاباتك المحلية هنا.",
    "सहेजा गया प्रयास उपलब्ध नहीं है या लोड नहीं हो सका। आपके स्थानीय उत्तर अभी भी यहाँ हैं।"
  ],
  "Include negative starting numbers": [
    "Incluir números iniciales negativos", "Inclure des nombres de départ négatifs", "Negative Ausgangszahlen einbeziehen",
    "Incluir números iniciais negativos", "包含负的起始数", "包含負的起始數", "計算に使う数に負の数を含める",
    "تضمين أعداد سالبة في المعطيات", "ऋणात्मक शुरुआती संख्याएँ शामिल करें"
  ],
  "Answers may still be negative when this is off.": [
    "Las respuestas pueden ser negativas aunque esta opción esté desactivada.",
    "Les réponses peuvent être négatives même si cette option est désactivée.",
    "Ergebnisse können auch bei deaktivierter Option negativ sein.",
    "As respostas podem ser negativas mesmo com esta opção desativada.",
    "关闭此选项时，答案仍可能为负数。", "關閉此選項時，答案仍可能為負數。",
    "この設定がオフでも、答えが負の数になることがあります。",
    "قد تكون الإجابات سالبة حتى عند إيقاف هذا الخيار.", "यह विकल्प बंद होने पर भी उत्तर ऋणात्मक हो सकते हैं।"
  ],
  "Use 4,096 characters or fewer for a numeric answer.": [
    "Usa un máximo de 4.096 caracteres para una respuesta numérica.",
    "Utilisez au maximum 4 096 caractères pour une réponse numérique.",
    "Verwenden Sie höchstens 4.096 Zeichen für eine numerische Antwort.",
    "Use no máximo 4.096 caracteres para uma resposta numérica.",
    "数值答案请使用不超过 4096 个字符。", "數值答案請使用不超過 4096 個字元。",
    "数値の回答は4,096文字以内で入力してください。",
    "استخدم ٤٬٠٩٦ حرفًا أو أقل للإجابة الرقمية.", "संख्यात्मक उत्तर के लिए 4,096 या उससे कम वर्णों का उपयोग करें।"
  ],
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
