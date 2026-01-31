/// <reference types="@figma/plugin-typings" />
// This file runs in the Figma plugin environment

const NON_BREAKING_SPACE = '\u00A0';

// Russian typography rules for non-breaking spaces
function shouldReplaceSpace(text: string, index: number): boolean {
  const charBefore = index > 0 ? text[index - 1] : '';
  const charAfter = index < text.length - 1 ? text[index + 1] : '';
  
  // Single-letter prepositions: в, к, с, о, у, из, от, до, на, по, за, про, со, во, об, обо
  const singleLetterPrepositions = ['в', 'к', 'с', 'о', 'у'];
  const twoLetterPrepositions = ['из', 'от', 'до', 'на', 'по', 'за', 'со', 'во', 'об'];
  const threeLetterPrepositions = ['про', 'обо'];
  
  // Single-letter conjunctions: и, а, но
  const singleLetterConjunctions = ['и', 'а'];
  const twoLetterConjunctions = ['но'];
  
  // Check if space is after a single-letter preposition
  if (singleLetterPrepositions.includes(charBefore.toLowerCase())) {
    return true;
  }
  
  // Check if space is after a two-letter preposition
  if (index >= 2) {
    const twoChars = text.substring(index - 2, index).toLowerCase();
    if (twoLetterPrepositions.includes(twoChars)) {
      return true;
    }
  }
  
  // Check if space is after a three-letter preposition
  if (index >= 3) {
    const threeChars = text.substring(index - 3, index).toLowerCase();
    if (threeLetterPrepositions.includes(threeChars)) {
      return true;
    }
  }
  
  // Check if space is after a single-letter conjunction
  if (singleLetterConjunctions.includes(charBefore.toLowerCase())) {
    return true;
  }
  
  // Check if space is after a two-letter conjunction
  if (index >= 2) {
    const twoChars = text.substring(index - 2, index).toLowerCase();
    if (twoLetterConjunctions.includes(twoChars)) {
      return true;
    }
  }
  
  // Check for initials (single letter followed by period, then space)
  if (index >= 2 && /[А-ЯЁ]\./.test(text.substring(index - 2, index))) {
    return true;
  }
  
  // Check for numbers followed by units (e.g., "12 кг", "5 м")
  if (/[0-9]/.test(charBefore)) {
    const units = ['кг', 'г', 'м', 'см', 'мм', 'км', 'л', 'мл', 'т', 'ц', 'руб', 'коп', '₽', '$', '€', '°', '%', 'px', 'pt', 'em', 'rem'];
    const textAfter = text.substring(index + 1).toLowerCase();
    for (const unit of units) {
      if (textAfter.startsWith(unit.toLowerCase())) {
        return true;
      }
    }
  }
  
  // Check for abbreviations: и т. д., и т. п., и др., и пр.
  if (index >= 4) {
    const beforeText = text.substring(index - 4, index).toLowerCase();
    if (beforeText === 'т. д' || beforeText === 'т. п') {
      return true;
    }
  }
  if (index >= 3) {
    const beforeText = text.substring(index - 3, index).toLowerCase();
    if (beforeText === ' др' || beforeText === ' пр') {
      return true;
    }
  }
  
  // Check for dash after space (e.g., "Восемнадцать — это")
  if (charAfter === '—' || charAfter === '–' || charAfter === '-') {
    return true;
  }
  
  // Check for short words: что, как, так, то, же, ли, бы, б, ж, ль, ведь, мол, де
  const shortWords = ['что', 'как', 'так', 'то', 'же', 'ли', 'бы', 'б', 'ж', 'ль', 'ведь', 'мол', 'де'];
  if (index >= 4) {
    const fourChars = text.substring(index - 4, index).toLowerCase();
    if (shortWords.includes(fourChars)) {
      return true;
    }
  }
  if (index >= 3) {
    const threeChars = text.substring(index - 3, index).toLowerCase();
    if (shortWords.includes(threeChars)) {
      return true;
    }
  }
  if (index >= 2) {
    const twoChars = text.substring(index - 2, index).toLowerCase();
    if (shortWords.includes(twoChars)) {
      return true;
    }
  }
  
  return false;
}

function replaceSpaces(text: string): { result: string; count: number } {
  let result = '';
  let count = 0;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && shouldReplaceSpace(text, i)) {
      result += NON_BREAKING_SPACE;
      count++;
    } else {
      result += text[i];
    }
  }
  
  return { result, count };
}

function collectTextNodes(scope: 'selection' | 'page' | 'file'): TextNode[] {
  const nodes: TextNode[] = [];
  
  function traverse(node: SceneNode) {
    if (node.type === 'TEXT') {
      nodes.push(node);
    } else if ('children' in node) {
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
  } else if (scope === 'page') {
    for (const node of figma.currentPage.children) {
      traverse(node);
    }
  } else if (scope === 'file') {
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

function processText(scope: 'selection' | 'page' | 'file'): { success: boolean; count: number; error?: string } {
  let totalCount = 0;
  
  try {
    const textNodes = collectTextNodes(scope);
    
    if (textNodes.length === 0) {
      return { success: false, count: 0, error: 'No text nodes found in the selected scope.' };
    }
    
    for (const node of textNodes) {
      const originalText = node.characters;
      const { result, count } = replaceSpaces(originalText);
      
      if (count > 0) {
        // Load font before setting text
        figma.loadFontAsync(node.fontName as FontName).then(() => {
          node.characters = result;
        });
        
        totalCount += count;
      }
    }
    
    return { success: true, count: totalCount };
  } catch (error) {
    return { success: false, count: 0, error: error instanceof Error ? error.message : 'Unknown error occurred.' };
  }
}

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 400 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'process') {
    const result = processText(msg.scope);
    figma.ui.postMessage({
      type: 'result',
      success: result.success,
      count: result.count,
      error: result.error
    });
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};