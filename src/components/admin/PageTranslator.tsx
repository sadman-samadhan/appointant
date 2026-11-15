'use client';

// Arabic for the older admin pages without rewriting each one: while Arabic is on, every text
// and label on screen that exactly matches an English phrase in the dictionary is shown in Arabic
// (pop-ups and messages included). Switching back puts the English back. New pages use t() directly.
import { useEffect } from 'react';
import { AR } from '@/lib/i18n/ar';
import type { Lang } from '@/context/LanguageContext';

const ATTRS = ['placeholder', 'title', 'aria-label'] as const;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

// What was there before, so English can be put back exactly.
const originalText = new WeakMap<Text, string>();
const originalAttr = new WeakMap<Element, Record<string, string>>();

function arabicFor(english: string): string | undefined {
  const key = english.trim();
  if (!key) return undefined;
  const ar = AR[key];
  if (!ar) return undefined;
  // Keep the spaces around the words, which separate them from neighbouring text.
  const lead = english.match(/^\s*/)?.[0] ?? '';
  const tail = english.match(/\s*$/)?.[0] ?? '';
  return lead + ar + tail;
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node as Text;
    const parent = text.parentElement;
    if (!parent || SKIP.has(parent.tagName) || parent.closest('[data-no-translate]')) return;
    const current = text.nodeValue ?? '';
    const ar = arabicFor(current);
    if (ar && ar !== current) {
      originalText.set(text, current);
      text.nodeValue = ar;
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (SKIP.has(el.tagName) || el.hasAttribute('data-no-translate')) return;
  for (const attr of ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const ar = arabicFor(value);
    if (ar && ar !== value) {
      const saved = originalAttr.get(el) ?? {};
      saved[attr] = value;
      originalAttr.set(el, saved);
      el.setAttribute(attr, ar);
    }
  }
  // <option> text is a text node; <input type=submit|button> uses value.
  if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'button')) {
    const ar = arabicFor(el.value);
    if (ar) {
      const saved = originalAttr.get(el) ?? {};
      saved.value = el.value;
      originalAttr.set(el, saved);
      el.value = ar;
    }
  }
  el.childNodes.forEach(translateNode);
}

function restoreNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node as Text;
    const en = originalText.get(text);
    // Only put English back if React hasn't replaced the text since.
    if (en !== undefined && AR[en.trim()] && text.nodeValue === arabicFor(en)) text.nodeValue = en;
    originalText.delete(text);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const saved = originalAttr.get(el);
  if (saved) {
    for (const [attr, value] of Object.entries(saved)) {
      if (attr === 'value' && el instanceof HTMLInputElement) el.value = value;
      else el.setAttribute(attr, value);
    }
    originalAttr.delete(el);
  }
  el.childNodes.forEach(restoreNode);
}

export function PageTranslator({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (lang !== 'ar') return;
    const root = document.body;
    translateNode(root);
    let busy = false;
    const observer = new MutationObserver((records) => {
      if (busy) return;
      busy = true;
      try {
        for (const r of records) {
          if (r.type === 'characterData') translateNode(r.target);
          else if (r.type === 'attributes') translateNode(r.target);
          else r.addedNodes.forEach(translateNode);
        }
      } finally {
        // Our own changes also fire the observer; drop those.
        observer.takeRecords();
        busy = false;
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => {
      observer.disconnect();
      restoreNode(root);
    };
  }, [lang]);
  return null;
}
