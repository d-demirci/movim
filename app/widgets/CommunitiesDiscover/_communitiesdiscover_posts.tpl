{loop="$posts"}
    <li class="block" onclick="MovimUtils.redirect('{$c->route('post', [$value->origin, $value->node, $value->nodeid])}')">
        {if="$value->picture"}
            <span class="primary thumb icon" style="background-image: url('{$value->picture}');"></span>
        {else}
            <span class="primary thumb color icon color {$value->node|stringToColor}">
                {$value->node|firstLetterCapitalize}
            </span>
        {/if}
        <p class="line" {if="isset($value->title)"}title="{$value->title}"{/if}>
        {if="isset($value->title)"}
            {$value->title}
        {else}
            {$value->node}
        {/if}
        </p>
        <p dir="auto">{$value->getSummary()}</p>
        <p>
            <a href="{$c->route('community', [$value->origin, $value->node])}">{$value->node}</a>

            {$count = $value->countLikes()}
            {if="$count > 0"}
                {$count} <i class="zmdi zmdi-favorite-outline"></i>
            {/if}

            {$count = $value->countComments()}
            {if="$count > 0"}
                {$count} <i class="zmdi zmdi-comment-outline"></i>
            {/if}

            <span class="info">
                {$value->published|strtotime|prepareDate:true,true}
            </span>
        </p>
    </li>
{/loop}
