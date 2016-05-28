import createStore from './harmonized';
import Item from './test.item';
import LocalStorage from './test.local-storage';
import Transporter from './test.transporter';

export default createStore({Item, Transporter, LocalStorage});
