import { EditorView } from '@codemirror/view';
import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'preact/compat';
import useOnclickOutside from 'react-cool-onclickoutside';
import { t } from 'src/lang/helpers';
import {getUnitTitleSpell, parseUnitTitle} from 'src/parsers/helpers/parser';

import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
import { KanbanContext } from '../context';
import { c, generateInstanceId } from '../helpers';
import { UnitTemplate } from '../types';

interface UnitFormProps {
  onNewUnit: (id: string) => void;
  closeUnitForm: () => void;
}

export function UnitForm({ onNewUnit, closeUnitForm }: UnitFormProps) {
  const [shouldMarkAsComplete, setShouldMarkAsComplete] = useState(false);
  // 多音字选择框是否显示
  const [shouldShowPinyinInput, setShouldShowPinyinInput] = useState(false);
  // 多音字数组
  const [pinyinInput, setPinyinInput] = useState([]);
  const editorRef = useRef<EditorView>();
  const inputRef = useRef<HTMLTextAreaElement>();
  const clickOutsideRef = useOnclickOutside(() => closeUnitForm(), {
    ignoreClass: [c('ignore-click-outside'), 'mobile-toolbar', 'suggestion-container'],
  });

  const { boardModifiers, stateManager } = useContext(KanbanContext);

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const createUnit = useCallback(
    (cm: EditorView, title: string,pingYin = "") => {
      let  unitTitle = "";
      if (pingYin !== "") {
        unitTitle = pingYin
      }else{
        const unitTitleSpell = getUnitTitleSpell(title);
        if (unitTitleSpell.type === 0) {
          setShouldShowPinyinInput(true)
          setPinyinInput(unitTitleSpell.data as string[])
          return
        }else{
          unitTitle = unitTitleSpell.data as string;
        }
      }
      const instanceId = generateInstanceId();
      const newItem = stateManager.getNewItem(title, ' ', false);
      boardModifiers.insertUnits({
        ...UnitTemplate,
        id: instanceId,
        children: [newItem],
        data: {
          ...parseUnitTitle(unitTitle),
          shouldMarkItemsComplete: shouldMarkAsComplete,
        },
      });

      cm.dispatch({
        changes: {
          from: 0,
          to: cm.state.doc.length,
          insert: '',
        },
      });

      setShouldMarkAsComplete(false);
      onNewUnit(newItem.id);
    },
    [onNewUnit, setShouldMarkAsComplete, boardModifiers]
  );

  const editState = useMemo(() => ({ x: 0, y: 0 }), []);
  const onEnter = useCallback(
    (cm: EditorView, mod: boolean, shift: boolean) => {
      if (!allowNewLine(stateManager, mod, shift)) {
        createUnit(cm, cm.state.doc.toString());
        return true;
      }
    },
    [createUnit]
  );
  const onSubmit = useCallback(
    (cm: EditorView) => createUnit(cm, cm.state.doc.toString()),
    [createUnit]
  );

  return (
    <div ref={clickOutsideRef} className={c('lane-form-wrapper')}>
      <div className={c('lane-input-wrapper')}>
        <MarkdownEditor
          className={c('lane-input')}
          editorRef={editorRef}
          editState={editState}
          onEnter={onEnter}
          onEscape={closeUnitForm}
          onSubmit={onSubmit}
        />
      </div>
      {shouldShowPinyinInput && <div className={c('unit-pinyin-box')}>
        {/* 循环渲染pinyinInput*/}
        {pinyinInput.map((item, index) => {
          return <button key={index}
            className={c('unit-pinyin-button')}
            onClick={() => {
              if (editorRef.current) {
                createUnit(editorRef.current, editorRef.current.state.doc.toString(), item);
                setPinyinInput([])
                setShouldShowPinyinInput(false)
              }
            }}
          >
            {item}
          </button>
        })}
      </div>}

      <div className={c('lane-input-actions')}>
        <button
          className={c('lane-action-add')}
          onClick={() => {
            if (editorRef.current) {
              createUnit(editorRef.current, editorRef.current.state.doc.toString());
            }
          }}
        >
        {t('Add list')}
        </button>
        <button className={c('lane-action-cancel')} onClick={closeUnitForm}>
          {t('Done')}
        </button>
      </div>
    </div>
  );
}
