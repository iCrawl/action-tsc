# action-tsc
> Typescript compiler [action](https://github.com/features/actions)

Compile your Typescript code and check for errors.

## Usage

`.github/workflows/tsc.yml`
```yml
on:
  push:
  pull_request:

jobs:
  tsc:
    name: tsc
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - name: install node v12
      uses: actions/setup-node@v1
      with:
        node-version: 12
    - name: yarn install
      run: yarn install
    - name: tsc
      uses: icrawl/action-tsc@v1
```

### Passing command-line parameters to `tsc`

You can pass the `--project` parameter to `tsc` if your `tsconfig.json` is not in the root of your project:

```yml
    - name: tsc compile
      uses: iCrawl/action-tsc@v1
      with:
        project: subdirectorywith_tsconfig
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

**action-tsc** © [iCrawl](https://github.com/iCrawl)  
Authored and maintained by iCrawl.

> GitHub [@iCrawl](https://github.com/iCrawl) · Twitter [@iCrawlToGo](https://twitter.com/iCrawlToGo)
