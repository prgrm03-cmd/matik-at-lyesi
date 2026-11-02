import { baslat } from './motor/motor.js';

baslat({
  kok: document.getElementById('atolye'),
  url: new URLSearchParams(location.search)
});
