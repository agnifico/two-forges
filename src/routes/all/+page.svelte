<!-- /all: the home page, with the War Forge shown from the start (the layout reveals it on this route
     and remembers it, so / shows it too from then on). -->
<script lang="ts">
	import Home from '../+page.svelte';
	import type { PageProps } from './$types';

	let props: PageProps = $props();
</script>

<Home {...props} />
