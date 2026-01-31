"use strict";
/// <reference types="@figma/plugin-typings" />
// This file runs in the Figma plugin environment
const NON_BREAKING_SPACE = '\u00A0';
// Словари для неразрывных пробелов (из SBOL Typograph)
const nbspBefore = "б|бы|ж|же|ли|ль";
const nbspAfter = "а|б|без|безо|будто|бы|в|во|ведь|вне|вот|всё|где|да|даже|для|до|если|есть|ещё|же|за|и|из|изо|из-за|из-под|или|иль|к|ко|как|ли|ли|либо|между|на|над|надо|не|ни|но|о|об|обо|около|оно|от|ото|перед|по|по-за|по-над|под|подо|после|при|про|ради|с|со|сквозь|так|также|там|тем|то|тогда|того|тоже|у|хоть|хотя|чего|через|что|чтобы|это|этот|этого|№|§|АО|ОАО|ЗАО|ООО|ПАО|стр\\.|гл\\.|рис\\.|илл\\.|ст\\.|п\\.|c\\.";
function replaceSpaces(text) {
    let result = text;
    let collapsedSpaces = 0;
    let nbspCount = 0;
    let regexp;
    // Схлопываем множественные пробелы (обычные и неразрывные) в один обычный пробел
    // Это нужно делать перед применением правил типографики
    result = result.replace(/[\u0020\u00A0]{2,}/g, function (match) {
        // Подсчитываем сколько пробелов было схлопнуто (длина match - 1, так как остается 1 пробел)
        collapsedSpaces += match.length - 1;
        return ' ';
    });
    // Неразрывные пробелы между словом и и т.д. и т.п. и др.
    result = result.replace(/(.)\u0020+(и)\u0020+(т\.д\.|т\.п\.|др\.)/g, function (match, p1, p2, p3) {
        nbspCount += 2; // Добавляем 2 неразрывных пробела
        return p1 + NON_BREAKING_SPACE + p2 + NON_BREAKING_SPACE + p3;
    });
    // Неразрывный пробел ПЕРЕД б, бы, ж, же, ли, ль
    regexp = new RegExp("\\u0020(" + nbspBefore + ")([^А-ЯЁа-яё])", "gim");
    result = result.replace(regexp, function (match, p1, p2) {
        nbspCount++;
        return NON_BREAKING_SPACE + p1 + p2;
    });
    // Неразрывный пробел ПОСЛЕ слов из словаря
    regexp = new RegExp('(^|[\\u0020\\u00A0\\«\\„\\"\\(\\[])(' + nbspAfter + ")\\u0020", "gim");
    result = result.replace(regexp, function (match, p1, p2) {
        nbspCount++;
        return p1 + p2 + NON_BREAKING_SPACE;
    });
    // Неразрывный пробел ПОСЛЕ №, если пробела нет №123
    result = result.replace(/№([^\s])/gm, function (match, p1) {
        nbspCount++;
        return "№" + NON_BREAKING_SPACE + p1;
    });
    // Неразрывный пробел между числом и следующим словом
    result = result.replace(/(\d)\u0020+([a-zA-zа-яёА-ЯЁ])/gi, function (match, p1, p2) {
        nbspCount++;
        return p1 + NON_BREAKING_SPACE + p2;
    });
    // Неразрывный пробел ПОСЛЕ сокращений: город, область, край, станция, поселок, село, деревня, улица, переулок, проезд, проспект, бульвар, площадь, набережная, шоссе, тупик, офис, комната, участок, владение, строение, корпус, дом, квартира, микрорайон или ПОСЛЕ дом или литер
    result = result.replace(/(^|[\u0020\u00A0])((?:(?:г|обл|кр|ст|пос|с|д|ул|пер|пр|пр-т|просп|пл|бул|б-р|наб|ш|туп|оф|кв|комн?|под|мкр|уч|вл|влад|стр|корп?|эт|пгт)\.)|(?:дом|литера?))\u0020?(\-?[А-ЯЁ\d])/gm, function (match, p1, p2, p3) {
        nbspCount++;
        return p1 + p2 + "." + NON_BREAKING_SPACE + p3;
    });
    // Неразрывный пробел ПОСЛЕ короткого слова (1-3 буквы)
    // Это ключевое правило для предотвращения висячих предлогов и союзов
    result = result.replace(/(^|[\u0020\u00A0\«\„\"\(\[])([А-ЯЁа-яё]{1,3})\u0020/gim, function (match, p1, p2) {
        nbspCount++;
        return p1 + p2 + NON_BREAKING_SPACE;
    });
    // Неразрывный пробел ПЕРЕД последним коротким словом в предложении или одиночной строке
    // Это предотвращает одиночные короткие слова в конце строки
    result = result.replace(/\u0020([А-ЯЁа-яё]{1,3}[\"\»]?[\)\]]?[\.\!\?\…]\‥?)/gim, function (match, p1) {
        nbspCount++;
        return NON_BREAKING_SPACE + p1;
    });
    // Неразрывный пробел перед тире (длинное, среднее или дефис)
    result = result.replace(/\u0020([—–\-])/g, function (match, p1) {
        nbspCount++;
        return NON_BREAKING_SPACE + p1;
    });
    // Неразрывный пробел после тире в начале предложения
    result = result.replace(/(^|[\u0020\u00A0])([—–])\u0020/g, function (match, p1, p2) {
        nbspCount++;
        return p1 + p2 + NON_BREAKING_SPACE;
    });
    // Неразрывный пробел между числом и единицами измерения
    const units = ['кг', 'г', 'м', 'см', 'мм', 'км', 'л', 'мл', 'т', 'ц', 'руб', 'коп', '₽', '$', '€', '°', '%', 'px', 'pt', 'em', 'rem'];
    for (const unit of units) {
        const unitRegex = new RegExp(`(\\d)\\u0020+(${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        result = result.replace(unitRegex, function (match, p1, p2) {
            nbspCount++;
            return p1 + NON_BREAKING_SPACE + p2;
        });
    }
    return { result, collapsedSpaces, nbspCount };
}
function collectTextNodes(scope) {
    const nodes = [];
    function traverse(node) {
        if (node.type === 'TEXT') {
            nodes.push(node);
        }
        else if ('children' in node) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }
    if (scope === 'selection') {
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            return [];
        }
        for (const node of selection) {
            traverse(node);
        }
    }
    else if (scope === 'page') {
        for (const node of figma.currentPage.children) {
            traverse(node);
        }
    }
    else if (scope === 'file') {
        for (const page of figma.root.children) {
            if (page.type === 'PAGE') {
                for (const node of page.children) {
                    traverse(node);
                }
            }
        }
    }
    return nodes;
}
async function processText(scope) {
    let totalCollapsedSpaces = 0;
    let totalNbspCount = 0;
    try {
        const textNodes = collectTextNodes(scope);
        if (textNodes.length === 0) {
            return { success: false, collapsedSpaces: 0, nbspCount: 0, error: 'No text nodes found in the selected scope' };
        }
        for (const node of textNodes) {
            const originalText = node.characters;
            const { result, collapsedSpaces, nbspCount } = replaceSpaces(originalText);
            if (collapsedSpaces > 0 || nbspCount > 0) {
                // Load font before setting text - важно дождаться загрузки
                await figma.loadFontAsync(node.fontName);
                // Устанавливаем текст после загрузки шрифта
                node.characters = result;
                totalCollapsedSpaces += collapsedSpaces;
                totalNbspCount += nbspCount;
            }
        }
        return { success: true, collapsedSpaces: totalCollapsedSpaces, nbspCount: totalNbspCount };
    }
    catch (error) {
        return { success: false, collapsedSpaces: 0, nbspCount: 0, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
}
// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 200 });
// Handle messages from UI
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'process') {
        const result = await processText(msg.scope);
        if (result.success) {
            if (result.collapsedSpaces > 0 && result.nbspCount > 0) {
                // Если и схлопнуты пробелы, и добавлены неразрывные
                const verb = result.nbspCount === 1 ? 'was' : 'were';
                figma.notify(`Double spaces were removed and ${result.nbspCount} non-breaking space${result.nbspCount !== 1 ? 's' : ''} ${verb} inserted`, { timeout: 3000 });
            }
            else if (result.nbspCount > 0) {
                // Если только добавлены неразрывные пробелы
                const verb = result.nbspCount === 1 ? 'was' : 'were';
                figma.notify(`${result.nbspCount} non-breaking space${result.nbspCount !== 1 ? 's' : ''} ${verb} added`, { timeout: 3000 });
            }
            else if (result.collapsedSpaces > 0) {
                // Если только схлопнуты пробелы
                figma.notify('Double spaces were removed. No need for non-breaking spaces', { timeout: 2000 });
            }
            else {
                // Если ничего не было сделано
                figma.notify('No spaces need replacement', { timeout: 2000 });
            }
        }
        else {
            // В случае ошибки показываем уведомление об ошибке
            figma.notify('Couldn\'t replace spaces. Try again later', { error: true, timeout: 3000 });
        }
        // Закрываем плагин после обработки
        figma.closePlugin();
    }
    else if (msg.type === 'close') {
        figma.closePlugin();
    }
};
