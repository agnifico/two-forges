<!-- Errors inside the site (a link to a station that doesn't exist, say), shown beside the island. -->
<script lang="ts">
	import { page } from '$app/state';
	import Lost from '#lib/components/Lost.svelte';
</script>

<Lost site={page.data.site ?? { name: 'Agnifico' }} status={page.status} />
