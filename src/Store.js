import {
  observable,
} from 'mobx';

export default class Store {
  @observable store = [];
  @observable deleted = [];
}
