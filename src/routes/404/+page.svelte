<!-- Prerendered as 404.html, which static hosts serve for any path they don't have. -->
<script lang="ts">
	import Lost from '#lib/components/Lost.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Lost site={data.site} />
