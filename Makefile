install:
	npm install

run: install
	npx wrangler pages dev ./public --kv=KV --r2=R2 --d1 D1=d1

pushdev:
	git push origin --force `git symbolic-ref --short HEAD`:dev

kill:
	pkill -9 -f workerd