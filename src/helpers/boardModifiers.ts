import update from 'immutability-helper';
import { moment } from 'obsidian';
import { KanbanView } from 'src/KanbanView';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import {
  appendEntities,
  getEntityFromPath,
  insertEntity,
  moveEntity,
  prependEntities,
  removeEntity,
  updateEntity,
  updateParentEntity,
} from 'src/dnd/util/data';

import { generateInstanceId } from '../components/helpers';
import { Board, DataTypes, Item, Lane } from '../components/types';

export interface BoardModifiers {
  appendItems: (path: Path, items: Item[]) => void;
  prependItems: (path: Path, items: Item[]) => void;
  insertItems: (path: Path, items: Item[]) => void;
  replaceItem: (path: Path, items: Item[]) => void;
  insertUnits: (lane: Lane) => void;
  splitItem: (path: Path, items: Item[]) => void;
  moveItemToTop: (path: Path) => void;
  moveItemToBottom: (path: Path) => void;
  addLane: (lane: Lane) => void;
  insertLane: (path: Path, lane: Lane) => void;
  updateLane: (path: Path, lane: Lane) => void;
  archiveLane: (path: Path) => void;
  archiveLaneItems: (path: Path) => void;
  deleteEntity: (path: Path) => void;
  updateItem: (path: Path, item: Item) => void;
  archiveItem: (path: Path) => void;
  duplicateEntity: (path: Path) => void;
}

export function getBoardModifiers(view: KanbanView, stateManager: StateManager): BoardModifiers {
  const appendArchiveDate = (item: Item) => {
    const archiveDateFormat = stateManager.getSetting('archive-date-format');
    const archiveDateSeparator = stateManager.getSetting('archive-date-separator');
    const archiveDateAfterTitle = stateManager.getSetting('append-archive-date');

    const newTitle = [moment().format(archiveDateFormat)];

    if (archiveDateSeparator) newTitle.push(archiveDateSeparator);

    newTitle.push(item.data.titleRaw);

    if (archiveDateAfterTitle) newTitle.reverse();

    const titleRaw = newTitle.join(' ');
    return stateManager.updateItemContent(item, titleRaw);
  };

  return {
    appendItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => appendEntities(boardData, path, items));
    },

    prependItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => prependEntities(boardData, path, items));
    },

    insertItems: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => insertEntity(boardData, path, items));
    },

    replaceItem: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) =>
        insertEntity(removeEntity(boardData, path), path, items)
      );
    },

    splitItem: (path: Path, items: Item[]) => {
      stateManager.setState((boardData) => {
        return insertEntity(removeEntity(boardData, path), path, items);
      });
    },

    moveItemToTop: (path: Path) => {
      stateManager.setState((boardData) => moveEntity(boardData, path, [path[0], 0]));
    },

    moveItemToBottom: (path: Path) => {
      stateManager.setState((boardData) => {
        const laneIndex = path[0];
        const lane = boardData.children[laneIndex];
        return moveEntity(boardData, path, [laneIndex, lane.children.length]);
      });
    },

    addLane: (lane: Lane) => {
      stateManager.setState((boardData) => {
        const collapseState = view.getViewState('list-collapse') || [];
        const op = (collapseState: boolean[]) => {
          const newState = [...collapseState];
          newState.push(false);
          return newState;
        };

        view.setViewState('list-collapse', undefined, op);
        return update<Board>(appendEntities(boardData, [], [lane]), {
          data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
        });
      });
    },
    insertUnits: (lane: Lane) => {
      stateManager.app.workspace.trigger('kanban:lane-added', stateManager.file, lane);
      const insertStringInOrder = function (newString: string, array: string[]) {
        let index = 0;
        while (index < array.length && newString > array[index]) {
          index++;
        }
        return index;
      };
      stateManager.setState((boardData) => {
        let i,
          j,
          z = 0;
        let findLane;
        const titles: string[] = [];
        for (i = 0; i < boardData.children.length; i++) {
          if (boardData.children[i].data.title === lane.data.title) {
            findLane = boardData.children[i];
            j = findLane.children.length - 1;
            findLane.children.forEach((item) => titles.push(item.data.title));
            break;
          }
        }
        if (findLane) {
          z = lane.children.findIndex((item) => titles.contains(item.data.title));
          console.log('findLane', boardData, findLane, i, j, z);

          if (z > -1) {
            z = z - 1;
            const path = [i, z];
            return updateParentEntity(boardData, path, {
              children: {
                [path[path.length - 1]]: {
                  $set: lane.children[0],
                },
              },
            });
            // return insertEntity(boardData, [i, z ], [...lane.children])
          }
          return appendEntities(boardData, [i, j], [...lane.children]);
        }
        // this.insertStringInOrder()
        if (boardData.children.length === 0) {
          return insertEntity(boardData, [], [lane]);
        } else {
          const titlesTmp = boardData.children.map((item) => item.data.title);
          const index = insertStringInOrder(lane.data.title, titlesTmp);
          return insertEntity(boardData, [index], [lane]);
        }
        // return insertEntity(boardData, [], [lane]);
      });
    },
    insertLane: (path: Path, lane: Lane) => {
      stateManager.setState((boardData) => {
        const collapseState = view.getViewState('list-collapse');
        const op = (collapseState: boolean[]) => {
          const newState = [...collapseState];
          newState.splice(path.last(), 0, false);
          return newState;
        };

        view.setViewState('list-collapse', undefined, op);

        return update<Board>(insertEntity(boardData, path, [lane]), {
          data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
        });
      });
    },

    updateLane: (path: Path, lane: Lane) => {
      stateManager.setState((boardData) =>
        updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: lane,
            },
          },
        })
      );
    },

    archiveLane: (path: Path) => {
      stateManager.setState((boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        try {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 1);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(removeEntity(boardData, path), {
            data: {
              settings: { 'list-collapse': { $set: op(collapseState) } },
              archive: {
                $unshift: stateManager.getSetting('archive-with-date')
                  ? items.map(appendArchiveDate)
                  : items,
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    archiveLaneItems: (path: Path) => {
      stateManager.setState((boardData) => {
        const lane = getEntityFromPath(boardData, path);
        const items = lane.children;

        try {
          return update(
            updateEntity(boardData, path, {
              children: {
                $set: [],
              },
            }),
            {
              data: {
                archive: {
                  $unshift: stateManager.getSetting('archive-with-date')
                    ? items.map(appendArchiveDate)
                    : items,
                },
              },
            }
          );
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    deleteEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const entity = getEntityFromPath(boardData, path);

        if (entity.type === DataTypes.Lane) {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 1);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(removeEntity(boardData, path), {
            data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
          });
        }

        return removeEntity(boardData, path);
      });
    },

    updateItem: (path: Path, item: Item) => {
      stateManager.setState((boardData) => {
        return updateParentEntity(boardData, path, {
          children: {
            [path[path.length - 1]]: {
              $set: item,
            },
          },
        });
      });
    },

    archiveItem: (path: Path) => {
      stateManager.setState((boardData) => {
        const item = getEntityFromPath(boardData, path);
        try {
          return update(removeEntity(boardData, path), {
            data: {
              archive: {
                $push: [
                  stateManager.getSetting('archive-with-date') ? appendArchiveDate(item) : item,
                ],
              },
            },
          });
        } catch (e) {
          stateManager.setError(e);
          return boardData;
        }
      });
    },

    duplicateEntity: (path: Path) => {
      stateManager.setState((boardData) => {
        const entity = getEntityFromPath(boardData, path);
        const entityWithNewID = update(entity, {
          id: {
            $set: generateInstanceId(),
          },
        });

        if (entity.type === DataTypes.Lane) {
          const collapseState = view.getViewState('list-collapse');
          const op = (collapseState: boolean[]) => {
            const newState = [...collapseState];
            newState.splice(path.last(), 0, collapseState[path.last()]);
            return newState;
          };
          view.setViewState('list-collapse', undefined, op);

          return update<Board>(insertEntity(boardData, path, [entityWithNewID]), {
            data: { settings: { 'list-collapse': { $set: op(collapseState) } } },
          });
        }

        return insertEntity(boardData, path, [entityWithNewID]);
      });
    },
  };
}
