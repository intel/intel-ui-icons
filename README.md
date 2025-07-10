[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/intel/intel-ui-icons/badge)](https://scorecard.dev/viewer/?uri=github.com/intel/intel-ui-icons)
[![CodeQL](https://github.com/intel/intel-ui-icons/workflows/CodeQL/badge.svg)](https://github.com/intel/intel-ui-icons/security/code-scanning)

# Intel® UI Icons

Offering Intel's brand icons. [Figma file here](https://www.figma.com/design/PBtt8sQheUxdJ2IXEROZBy/Spark-Island---Icons).

## Using icons

Import it to your css bundle (most likely into global `styles.scss`) like
the following:

```scss
@import 'intel-icons/dist.web/icons.css';
```

Basic usage example:

```html
<i className="spark-icon spark-icon-copy spark-icon-light" style={{ fontFamily: 'spark-icon' }} />
```

Where

- `i` tag can be any inline HTML element, e.g. `a`, `span`, `b` or `strong`, `button`, etc.
- `spark-icon` class name is a mandatory parameter that tells a page to use styles from _iconfont_ component
- `spark-icon-copy` instructs to use a particular shape for an icon. In this example the icon will look like two overlapping pages (copy to clipboard).
- `spark-icon-light`, `spark-icon-regular`, `spark-icon-solid` filled or outlined shapes with a thin, medium or thick stroke

## Troubleshooting

Running fantasticon on Windows: Downgrade version to 1.2.3.
