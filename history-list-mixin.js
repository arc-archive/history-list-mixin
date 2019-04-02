/**
@license
Copyright 2018 The Advanced REST client authors <arc@mulesoft.com>
Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
*/
import {dedupingMixin} from '../../@polymer/polymer/lib/utils/mixin.js';
import {afterNextRender} from '../../@polymer/polymer/lib/utils/render-status.js';

/**
 * A mixin to be applied to a list that renders history requests.
 * It contains methods to query for history list and to search history.
 * @polymer
 * @mixinFunction
 * @memberof ArcComponents
 */
export const HistoryListMixin = dedupingMixin((base) => {
  /**
   * @polymer
   * @mixinClass
   */
  class HistoryListMixin extends base {
    static get properties() {
      return {
        /**
         * The list of request to render.
         * @type {Array<Object>}
         */
        requests: Array,
        /**
         * True when the element is querying the database for the data.
         */
        querying: {
          type: Boolean,
          readOnly: true,
          notify: true
        },
        /**
         * Single page query limit.
         */
        pageLimit: {
          type: Number,
          value: 150
        },
        _queryStartKey: String,
        _querySkip: Number,
        /**
         * Computed value.
         * Database query options for pagination.
         * Use `pageLimit` to set pagination limit.
         */
        queryOptions: {
          type: Object,
          computed: '_computeQueryOptions(pageLimit, _queryStartKey, _querySkip)'
        },
        /**
         * Computed value. True if query ended and there's no results.
         */
        dataUnavailable: {
          type: Boolean,
          computed: '_computeDataUnavailable(hasRequests, querying, isSearch)'
        },
        /**
         * When set this component is in search mode.
         * This means that the list won't be loaded automatically and
         * some operations not related to search are disabled.
         */
        isSearch: {
          type: Boolean,
          value: false
        },
        /**
         * Computed value. True when the query has been performed and no items
         * has been returned. It is different from `listHidden` where less
         * conditions has to be checked. It is set to true when it doesn't
         * have items, is not loading and is search.
         */
        searchListEmpty: {
          type: Boolean,
          computed: '_computeSearchListEmpty(hasRequests, loading, isSearch)'
        },
        /**
         * When set it won't query for data automatically when attached to the DOM.
         */
        noAuto: Boolean
      };
    }

    constructor() {
      super();
      this._dataImportHandler = this._dataImportHandler.bind(this);
      this._onDatabaseDestroy = this._onDatabaseDestroy.bind(this);
    }

    connectedCallback() {
      if (!this.type) {
        this.type = 'history';
      }
      super.connectedCallback();
      window.addEventListener('data-imported', this._dataImportHandler);
      window.addEventListener('datastore-destroyed', this._onDatabaseDestroy);
      if (!this.noAuto && !this.querying && !this.requests) {
        this.loadNext();
      }
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.removeEventListener('data-imported', this._dataImportHandler);
      window.removeEventListener('datastore-destroyed', this._onDatabaseDestroy);
    }
    /**
     * Computes pagination options.
     * This resets pagination status.
     * @param {Number} limit Items per page limit.
     * @param {String} startKey Query start key
     * @param {Number} skip Number of records to skip.
     * @return {Object} Pagination options for PouchDB.
     */
    _computeQueryOptions(limit, startKey, skip) {
      const result = {
        limit,
        descending: true,
        // jscs:disable
        include_docs: true
        // jscs:enable
      };
      if (startKey) {
        result.startkey = startKey;
      }
      if (skip) {
        result.skip = skip;
      }
      return result;
    }

    /**
     * Computes value for the `dataUnavailable` proeprty
     * @param {Boolean} hasRequests [description]
     * @param {Booelan} loading [description]
     * @param {Boolean} isSearch [description]
     * @return {Boolean}
     */
    _computeDataUnavailable(hasRequests, loading, isSearch) {
      return !isSearch && !loading && !hasRequests;
    }

    /**
     * Computes value for the `searchListEmpty` property
     * @param {Boolean} hasRequests [description]
     * @param {Booelan} loading [description]
     * @param {Boolean} isSearch [description]
     * @return {Boolean}
     */
    _computeSearchListEmpty(hasRequests, loading, isSearch) {
      return !!isSearch && !loading && !hasRequests;
    }

    /**
     * Refreshes the data from the datastore.
     * It resets the query options, clears requests and makes a query to the datastore.
     */
    refresh() {
      this.reset();
      this.loadNext();
    }
    /**
     * Resets the state of the variables.
     */
    reset() {
      if (this._queryStartKey) {
        this._queryStartKey = undefined;
      }
      if (this._querySkip) {
        this._querySkip = undefined;
      }
      if (this.isSearch) {
        this.isSearch = false;
      }
      if (this.querying) {
        this._setQuerying(false);
      }
      if (this.requests) {
        this.set('requests', undefined);
      }
    }
    /**
     * Handler for `data-imported` cutom event.
     * Refreshes data state.
     */
    _dataImportHandler() {
      this.refresh();
    }
    /**
     * Handler for the `datastore-destroyed` custom event.
     * If one of destroyed databases is history store then it refreshes the sate.
     * @param {CustomEvent} e
     */
    _onDatabaseDestroy(e) {
      let datastore = e.detail.datastore;
      if (!datastore || !datastore.length) {
        return;
      }
      if (typeof datastore === 'string') {
        datastore = [datastore];
      }
      if (datastore.indexOf('history-requests') === -1 &&
        datastore.indexOf('history') === -1 &&
        datastore[0] !== 'all') {
        return;
      }
      this.refresh();
    }
    /**
     * Loads next page of results. It runs the task in a debouncer set to
     * next render frame so it's safe to call it more than once at the time.
     */
    loadNext() {
      if (this.isSearch) {
        return;
      }
      if (this.__makingQuery) {
        return;
      }
      this.__makingQuery = true;
      afterNextRender(this, () => {
        this.__makingQuery = false;
        this._loadPage();
      });
    }
    /**
     * Appends array items to the `requests` property.
     * It should be used instead of direct manipulation of the `items` array.
     * @param {Array<Object>} requests List of requests to appenmd
     */
    _appendItems(requests) {
      if (!requests || !requests.length) {
        return;
      }
      const existing = this.requests;
      if (!existing) {
        this.set('requests', requests);
        return;
      }
      requests.forEach((item) => this.push('requests', item));
    }
    /**
     * Loads next page of results from the datastore.
     * Pagination used here has been described in PouchDB pagination strategies
     * document.
     * @return {Promise}
     */
    _loadPage() {
      if (this.isSearch || this.querying) {
        return Promise.resolve();
      }
      const e = this._dispatchListEvent();
      if (!e.defaultPrevented) {
        let msg = 'Request model not found.';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      }
      this._setQuerying(true);
      return e.detail.result
      .then((response) => {
        this._setQuerying(false);
        if (response && response.rows.length > 0) {
          // Set up pagination.
          this._queryStartKey = response.rows[response.rows.length - 1].key;
          if (!this._querySkip) {
            this._querySkip = 1;
          }
          let res = response.rows.map((item) => item.doc);
          res = this._processHistoryResults(res);
          this._appendItems(res);
          afterNextRender(this, () => {
            if (this.notifyResize) {
              this.notifyResize();
            }
          });
        }
      })
      .catch((error) => {
        this._setQuerying(false);
        this._handleError(error);
      });
    }
    /**
     * Dispatches `request-list` custom event and returns the event.
     * @return {CustomEvent}
     */
    _dispatchListEvent() {
      const e = new CustomEvent('request-list', {
        cancelable: true,
        composed: true,
        bubbles: true,
        detail: {
          queryOptions: this.queryOptions,
          type: 'history'
        }
      });
      this.dispatchEvent(e);
      return e;
    }

    _handleError(cause) {
      console.error('[History list error]', cause);
      throw cause;
    }
    /**
     * Processes query results to generate view data model.
     * @param {Array} res List of history requests retreived from the datastore.
     * @return {Array} Processed data requests.
     */
    _processHistoryResults(res) {
      if (!res) {
        return;
      }
      if (!res.length) {
        return [];
      }
      res = this._ensureTimestamps(res);
      res.sort(this._sortHistoryResults);
      const today = this._getTodayTimestamp();
      const yesterday = this._getYesterdayTimestamp(today);
      res = this._groupHistory(res, today, yesterday);
      return res;
    }
    /**
     * Ensures that the history objects have the `updated` property
     * required by further computations while processing results.
     *
     * @param {Array<Object>} requests List of history requests
     * @return {Array<Object>} The same array but all requests will have `updated`
     * property.
     */
    _ensureTimestamps(requests) {
      return requests.map((item) => {
        if (!item.created || isNaN(item.created)) {
          item.created = Date.now();
        }
        if (!item.updated || isNaN(item.updated)) {
          item.updated = item.created;
        }
        return item;
      });
    }
    /**
     * Sorts the query results by `updated` property.
     * @param {Object} a
     * @param {Object} b
     * @return {Number}
     */
    _sortHistoryResults(a, b) {
      if (a.updated > b.updated) {
        return -1;
      }
      if (a.updated < b.updated) {
        return 1;
      }
      return 0;
    }
    /**
     * Creates a timestamp fot today, midnight
     * @return {Number}
     */
    _getTodayTimestamp() {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now.getTime();
    }
    /**
     * Computes yesterday's midninght based on today's mignight timestamp
     * @param {Number} todayTimestamp Timestamp of current daty at midnight
     * @return {Number} Timestamp 24 hours earlier.
     */
    _getYesterdayTimestamp(todayTimestamp) {
      return todayTimestamp - 86400000; // 24 h in milliseconds
    }
    /**
     * Creates headers for each day and group requests in each day group.
     * This is relevant for history type
     *
     * @param {Array<Object>} requests
     * @param {Number} today Timestamp of today
     * @param {Number} yesterday Timestamp of yesterday
     * @return {Array<Object>}
     */
    _groupHistory(requests, today, yesterday) {
      const days = [];
      const result = [];
      requests.forEach((item) => {
        const info = this._computeHistoryTime(item.updated);
        item.timeLabel = info.timeLabel;
        item.dayTime = info.time;
        let date = info.formatted;
        if (days.indexOf(date) === -1) {
          days[days.length] = date;
          let time = info.time;
          if (time === today) {
            item.today = true;
            date = 'Today';
          } else if (time === yesterday) {
            date = 'Yesterday';
          }
          item.hasHeader = true;
          item.header = date;
        }
        result.push(item);
      });
      return result;
    }
    /**
     * Computes time information for a history item. This is later used to
     * present history list item.
     * @param {Number} date Timestamp of when the item was created / updated
     * @return {Object} Various time formats:
     * - formatted - Formatted date string
     * - time - Parsed timestamp
     * - timeLabel - secondary list item
     */
    _computeHistoryTime(date) {
      const d = new Date(date);
      const formatted = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(d);
      const timeLabel = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
      }).format(d);
      d.setHours(0, 0, 0, 0);
      const time = d.getTime();
      return {
        formatted,
        time,
        timeLabel
      };
    }
    /**
     * Handles request model change when the type is history.
     * @param {Object} request Changed request object.
     */
    _historyTypeChanged(request) {
      const t = this.type;
      if (t !== 'history') {
        return;
      }
      if (['history', 'history-requests'].indexOf(request.type) === -1) {
        return;
      }
      const requests = this.requests;
      if (!requests) {
        this._insertItem(request);
        return;
      }
      const id = request._id;
      for (let i = 0, len = requests.length; i < len; i++) {
        if (requests[i]._id === id) {
          this._removeItem(i);
          break;
        }
      }
      this._insertItem(request);
    }
    /**
     * Removes history item at position.
     * @param {Number} index Item's index in requests array
     */
    _removeItem(index) {
      const old = this.requests[index];
      const nextIndex = index + 1;
      const next = this.requests[nextIndex];
      if (old.hasHeader && next && !next.hasHeader) {
        this.set(`requests.${nextIndex}.header`, old.header);
        this.set(`requests.${nextIndex}.hasHeader`, old.hasHeader);
        this.set(`requests.${nextIndex}.today`, old.today);
      }
      this.splice('requests', index, 1);
    }
    /**
     * Adds a new history item to the list at a position where its `updated` or
     * `created` time suggests.
     * @param {Object} item History model to add.
     */
    _insertItem(item) {
      const timeInfo = this._computeHistoryTime(item.updated || item.created);
      if (!this.requests) {
        this._appendHistoryTimeHeader(item, timeInfo, true);
        this.set('requests', [item]);
        return;
      }
      const index = this._historyInsertPosition(item.updated || item.created);
      const next = this.get(`requests.${index}`);
      if (next && next.hasHeader && next.dayTime === timeInfo.time) {
        this.set(`requests.${index}.hasHeader`, false);
        this.set(`requests.${index}.today`, false);
        this.set(`requests.${index}.header`, undefined);
      }
      let addHeader = true;
      if (index > 0) {
        const pIndex = index - 1;
        const prev = this.get(`requests.${pIndex}`);
        if (prev && prev.dayTime === timeInfo.time) {
          addHeader = false;
        }
      }
      this._appendHistoryTimeHeader(item, timeInfo, addHeader);
      this.splice('requests', index, 0, item);
    }
    /**
     * Determines a position of a history item to be inserted at.
     * The position is determined by `time` argument.
     * It always returns the position where the item to insert is newer than next item on the list.
     * @param {Number} time Request's `updated` or `created` property,.
     * @return {Number} Position at which insert the request.
     */
    _historyInsertPosition(time) {
      const list = this.requests;
      if (!list) {
        return 0;
      }
      let i = 0;
      let len = list.length;
      for (; i < len; i++) {
        const item = list[i];
        if (item.updated) {
          if (item.updated < time) {
            return i;
          }
        } else if (item.created) {
          if (item.created < time) {
            return i;
          }
        }
      }
      return i;
    }
    /**
     * Appends time properties to a history item.
     * @param {Object} item History model
     * @param {Object} timeInfo Generated time info object.
     * @param {Boolean} addHeader True to set header values.
     */
    _appendHistoryTimeHeader(item, timeInfo, addHeader) {
      item.timeLabel = timeInfo.timeLabel;
      item.dayTime = timeInfo.time;
      if (addHeader) {
        let date = timeInfo.formatted;
        let time = timeInfo.time;
        const today = this._getTodayTimestamp();
        if (time === today) {
          item.today = true;
          date = 'Today';
        } else if (time === this._getYesterdayTimestamp(today)) {
          date = 'Yesterday';
        }
        item.hasHeader = true;
        item.header = date;
      }
    }
    /**
     * Resets history object by removing items that has been added
     * when processing response.
     * @param {Object} request ARC request object
     * @return {Object}
     */
    _resetHistoryObject(request) {
      request.type = 'history';
      delete request.header;
      delete request.hasHeader;
      delete request.timeLabel;
      delete request.today;
      return request;
    }

    /**
     * Dispatches `request-query` custom event to `request-model`
     * to perform a query.
     *
     * @param {String} query The query to performs. Pass empty stirng
     * (or nothing) to reset query state.
     * @return {Promise} Resolved promise when the query ends.
     */
    query(query) {
      if (!query) {
        if (this.isSearch) {
          this.refresh();
        }
        return Promise.resolve();
      }
      this.isSearch = true;
      this._setQuerying(true);
      this.set('requests', undefined);

      const e = this._dispatchQueryEvent(query);
      if (!e.defaultPrevented) {
        const msg = 'Model not found.';
        console.warn(msg);
        return Promise.reject(new Error(msg));
      }
      return e.detail.result
      .then((result) => {
        result = this._processHistoryResults(result);
        this._appendItems(result);
        this._setQuerying(false);
      })
      .catch((error) => {
        this._setQuerying(false);
        this._handleError(error);
      });
    }
    /**
     * Dispatches `request-query` custom event.
     * This event is handled by `request-mode` element to query the
     * datastore for user search term.
     * @param {String} q Query passed to event detail.
     * @return {CustomEvent}
     */
    _dispatchQueryEvent(q) {
      const e = new CustomEvent('request-query', {
        cancelable: true,
        bubbles: true,
        composed: true,
        detail: {
          q,
          type: 'history'
        }
      });
      this.dispatchEvent(e);
      return e;
    }

    /**
     * Dispatched when the element requests next page of results.
     *
     * @event request-list
     * @param {String} type Always `history`
     * @param {Object} queryOptions Query options to pass to the database
     * engine.
     */

    /**
     * Dispatched when search was requested.
     *
     * @event request-query
     * @param {String} type Always `history`
     * @param {String} q User query
     */
  }
  return HistoryListMixin;
});
