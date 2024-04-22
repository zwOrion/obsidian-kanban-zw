import { Operation } from 'fast-json-patch';
import { moment } from 'obsidian';
import { StateManager } from 'src/StateManager';
import { Board, DataTypes, Item, Lane } from 'src/components/types';
import { Path } from 'src/dnd/types';
import { getEntityFromPath } from 'src/dnd/util/data';

import { getSearchValue } from '../common';
import { parseDataviewTaskMetadata, parseDefaultTaskMetadata } from './obsidian-tasks';

export async function hydrateLane(stateManager: StateManager, lane: Lane) {
  return lane;
}

export async function hydrateItem(stateManager: StateManager, item: Item) {
  const { dateStr, timeStr, fileAccessor } = item.data.metadata;

  if (dateStr) {
    item.data.metadata.date = moment(dateStr, stateManager.getSetting('date-format'));
  }

  if (timeStr) {
    let time = moment(timeStr, stateManager.getSetting('time-format'));

    if (item.data.metadata.date) {
      const date = item.data.metadata.date;

      date.hour(time.hour());
      date.minute(time.minute());
      date.second(time.second());

      time = date.clone();
    }

    item.data.metadata.time = time;
  }

  if (fileAccessor) {
    const file = stateManager.app.metadataCache.getFirstLinkpathDest(
      fileAccessor.target,
      stateManager.file.path
    );

    if (file) {
      item.data.metadata.file = file;
    }
  }

  const taskMetadata = parseDefaultTaskMetadata(item.data.title);
  if (taskMetadata) {
    item.data.metadata.taskMetadata = taskMetadata;
    if (stateManager.getSetting('hide-date-in-title')) {
      item.data.title = taskMetadata.description;
    }
  }
  const dataviewTaskMetadata = parseDataviewTaskMetadata(item.data.title);
  if (dataviewTaskMetadata) {
    item.data.metadata.taskMetadata = dataviewTaskMetadata;
    if (stateManager.getSetting('hide-date-in-title')) {
      item.data.title = dataviewTaskMetadata.description;
    }
  }

  item.data.titleSearch = getSearchValue(item, stateManager);

  return item;
}

export async function hydrateBoard(stateManager: StateManager, board: Board): Promise<Board> {
  try {
    await Promise.all(
      board.children.map(async (lane) => {
        try {
          await hydrateLane(stateManager, lane);
          await Promise.all(
            lane.children.map((item) => {
              return hydrateItem(stateManager, item);
            })
          );
        } catch (e) {
          stateManager.setError(e);
          throw e;
        }
      })
    );
  } catch (e) {
    stateManager.setError(e);
    throw e;
  }

  return board;
}

function opAffectsHydration(op: Operation) {
  return (
    (op.op === 'add' || op.op === 'replace') &&
    ['/title', '/titleRaw', '/dateStr', '/timeStr', /\d$/, /\/fileAccessor\/.+$/].some(
      (postFix) => {
        if (typeof postFix === 'string') {
          return op.path.endsWith(postFix);
        } else {
          return postFix.test(op.path);
        }
      }
    )
  );
}

export async function hydratePostOp(
  stateManager: StateManager,
  board: Board,
  ops: Operation[]
): Promise<Board> {
  const seen: Record<string, boolean> = {};
  const toHydrate = ops.reduce((paths, op) => {
    if (!opAffectsHydration(op)) {
      return paths;
    }

    const path = op.path.split('/').reduce((path, segment) => {
      if (/\d+/.test(segment)) {
        path.push(Number(segment));
      }

      return path;
    }, [] as Path);

    const key = path.join(',');

    if (!seen[key]) {
      seen[key] = true;
      paths.push(path);
    }

    return paths;
  }, [] as Path[]);

  try {
    await Promise.all(
      toHydrate.map((path) => {
        const entity = getEntityFromPath(board, path);

        if (entity.type === DataTypes.Lane) {
          return hydrateLane(stateManager, entity);
        }

        if (entity.type === DataTypes.Item) {
          return hydrateItem(stateManager, entity);
        }
      })
    );
  } catch (e) {
    stateManager.setError(e);
    throw e;
  }

  return board;
}
