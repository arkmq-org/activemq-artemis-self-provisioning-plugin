module.exports = {
  createOldCatalogs: false,
  // Save the \_old files

  defaultNamespace: 'plugin__activemq-artemis-self-provisioning-plugin',
  // Default namespace used in your i18next config

  keySeparator: false,
  // Key separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: Loading...')` will not think that there are a namespace and three separator dots for instance.

  locales: ['en'],
  // An array of the locales in your applications

  namespaceSeparator: '~',
  // Namespace separator used in your translation keys
  // If you want to use plain english keys, separators such as `.` and `:` will conflict. You might want to set `keySeparator: false` and `namespaceSeparator: false`. That way, `t('Status: Loading...')` will not think that there are a namespace and three separator dots for instance.

  reactNamespace: false,
  // For react file, extract the defaultNamespace - https://react.i18next.com/components/translate-hoc.html
  // Ignored when parsing a `.jsx` file and namespace is extracted from that file.

  defaultValue: function (_, __, key, ___) {
    // The `useKeysAsDefaultValues` option is deprecated in favor of `defaultValue` option function arguments.
    // The `key` is used to set default value.
    return key;
  },

  /**
   * Preserve dynamic translation keys that are used with variables.
   * These keys are used in MetricsActions.tsx where t(time) and t(span)
   * are called with dynamic values from pollTimeOptions and spanOptions arrays.
   * The parser cannot detect these at build time, so we explicitly preserve them.
   */
  keepRemoved: [
    // Poll time options (used in polling dropdown)
    '0',
    '15s',
    '30s',
    '1m',
    '5m',
    '15m',
    '30m',
    '1h',
    '6h',
    '12h',
    '1d',
    '2d',
    '1w',
    '2w',
    // Context variants with 'last' (e.g., "last 5 minutes")
    '5m_last',
    '15m_last',
    '30m_last',
    '1h_last',
    '6h_last',
    '12h_last',
    '1d_last',
    '2d_last',
    '1w_last',
    '2w_last',
  ],
};
