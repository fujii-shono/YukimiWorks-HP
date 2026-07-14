import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { siteLinks } from '@/data/links';

export default function LinksPage() {
  const links = [...siteLinks].sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));

  return (
    <SiteFrame>
      <RetroPanel title="Link" contentClassName="listing-panel-body">
        <div className="links-list-page">
          {links.map((link) => (
            <Link key={link.id} className="list-link-card" href={link.url} target="_blank" rel="noopener noreferrer">
              <strong>{link.label}</strong>
              {link.description ? <p>{link.description}</p> : null}
            </Link>
          ))}
        </div>
      </RetroPanel>
    </SiteFrame>
  );
}
