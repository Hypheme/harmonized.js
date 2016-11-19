import { Store } from './harmonized';
import Item from './Test.Item';
import LocalStorage from './Test.LocalStorage';
import Transporter from './Test.Transporter';

export default new Store({ Item, Transporter, LocalStorage });
