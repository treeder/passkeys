import { sliceDomain } from '../src/utils.js'

let domains = ['localhost', 'treeder.com', 'auth.treeder.com', 'x.y.treeder.com']

for (let levels = 1; levels <= 3; levels++) {
  console.log(`Levels: ${levels}`)
  for (let domain of domains) {
    console.log(`  ${domain}: ${sliceDomain(domain, levels)}`)
  }
}
