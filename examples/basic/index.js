import React from 'react';
import { render } from 'react-dom';

import TestDomain from './domains/test';

render((
  <div>
    <h1>Hey Sweety!!!!!!</h1>
    <TestDomain />
  </div>
), document.getElementById('example'));
