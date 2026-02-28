import { sliceDomain } from '../src/utils.js'

let domains = ['localhost', 'treeder.com', 'auth.treeder.com', 'x.y.treeder.com']

for (let domain of domains) {
  console.log(sliceDomain(domain, 3))
}
