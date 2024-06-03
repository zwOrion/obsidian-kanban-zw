import * as Pinyin from 'jian-pinyin';
import Preact from 'preact/compat';
import useOnclickOutside from 'react-cool-onclickoutside';
import { t } from 'src/lang/helpers';
import { parseLaneTitle } from 'src/parsers/helpers/parser';

import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
import { KanbanContext } from '../context';
import { c, generateInstanceId } from '../helpers';
import { LaneTemplate } from '../types';

export function UnitForm({
  onNewUnit,
  closeUnitForm,
}: {
  onNewUnit: () => void;
  closeUnitForm: () => void;
}) {
  const { boardModifiers, stateManager } = Preact.useContext(KanbanContext);
  const [shouldMarkAsComplete, setShouldMarkAsComplete] = Preact.useState(false);
  const [laneTitle, setLaneTitle] = Preact.useState('');

  const inputRef = Preact.useRef<HTMLTextAreaElement>();
  const clickOutsideRef = useOnclickOutside(
    () => {
      closeUnitForm();
    },
    {
      ignoreClass: c('ignore-click-outside'),
    }
  );

  Preact.useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey) {
      inputRef.current?.focus();
    }
  };
  Preact.useLayoutEffect(() => {
    window.addEventListener('keydown', onKeyDown); // 添加全局事件
    return () => {
      window.removeEventListener('keydown', onKeyDown); // 销毁
    };
  });
  const createLane = async () => {
    const title = await stateManager.getNewItem(laneTitle);
    // 获取第一个字符，判断是否是中文
    const firstChar = laneTitle.slice(0, 1);
    const firstCharSpell = Pinyin.getSpell(
      firstChar,
      function (character: string, spell: string) {
        console.log(character, spell);
        return spell[1];
      },
      ''
    );
    console.log(firstCharSpell);
    let splitElement = firstCharSpell.split(',')[0].slice(0, 1).toUpperCase();
    // 判断是否是A~Z
    if (splitElement < 'A' || splitElement > 'Z') {
      splitElement = '#1';
    }
    boardModifiers.insertUnits({
      ...LaneTemplate,
      id: generateInstanceId(),
      children: [title],
      data: {
        ...parseLaneTitle(splitElement),
        shouldMarkItemsComplete: shouldMarkAsComplete,
      },
    });

    setLaneTitle('');
    setShouldMarkAsComplete(false);
    onNewUnit();
  };
  const textareaProps = {
    autofocus: true,
    // 其他textarea属性
  };
  return (
    <div ref={clickOutsideRef} className={c('lane-form-wrapper')}>
      <div className={c('lane-input-wrapper')}>
        <MarkdownEditor
          ref={inputRef}
          className={c('lane-input')}
          onChange={(e) => setLaneTitle((e.target as HTMLTextAreaElement).value)}
          onEnter={(e) => {
            if (!allowNewLine(e, stateManager)) {
              e.preventDefault();
              createLane();
            }
          }}
          onSubmit={() => {
            createLane();
          }}
          onEscape={closeUnitForm}
          value={laneTitle}
          {...textareaProps}
        />
      </div>
      {/* <div className={c('checkbox-wrapper')}>
        <div className={c('checkbox-label')}>
          {t('Mark cards in this list as complete')}
        </div>
        <div
          onClick={() => setShouldMarkAsComplete(!shouldMarkAsComplete)}
          className={`checkbox-container ${
            shouldMarkAsComplete ? 'is-enabled' : ''
          }`}
        />
      </div>*/}
      <div className={c('lane-input-actions')}>
        <button className={c('lane-action-add')} onClick={createLane}>
          {t('Add list')}
        </button>
        <button className={c('lane-action-cancel')} onClick={closeUnitForm}>
          {t('Cancel')}
        </button>
      </div>
    </div>
  );
}
