/**
 * The ToyBox block: pick a toy; it renders on the page (server-side, like the shortcode).
 * Plain JavaScript using WordPress's globals, so there is no build step.
 */
(function (wp) {
  var el = wp.element.createElement;
  var __ = wp.i18n.__;
  var useSelect = wp.data.useSelect;
  var useBlockProps = wp.blockEditor.useBlockProps;
  var Placeholder = wp.components.Placeholder;
  var SelectControl = wp.components.SelectControl;
  var Spinner = wp.components.Spinner;

  wp.blocks.registerBlockType('toybox/toy', {
    edit: function (props) {
      var toys = useSelect(function (select) {
        return select('core').getEntityRecords('postType', 'toybox_toy', { per_page: -1, status: 'publish' });
      }, []);
      var blockProps = useBlockProps();
      var options = [{ label: __('Choose a toy…', 'toybox'), value: 0 }];
      (toys || []).forEach(function (t) {
        options.push({ label: (t.title && t.title.rendered) || __('(untitled)', 'toybox'), value: t.id });
      });
      var chosen = (toys || []).find(function (t) { return t.id === props.attributes.toyId; });
      return el(
        'div',
        blockProps,
        el(
          Placeholder,
          {
            icon: 'art',
            label: __('ToyBox', 'toybox'),
            instructions: chosen
              ? __('This toy appears here on the published page.', 'toybox')
              : __('Pick a toy to show. Make toys under ToyBox in the admin menu.', 'toybox'),
          },
          toys === null
            ? el(Spinner)
            : el(SelectControl, {
                label: __('Toy', 'toybox'),
                value: props.attributes.toyId,
                options: options,
                onChange: function (v) { props.setAttributes({ toyId: Number(v) }); },
                __nextHasNoMarginBottom: true,
              })
        )
      );
    },
    save: function () {
      return null; // Rendered by PHP.
    },
  });
})(window.wp);
