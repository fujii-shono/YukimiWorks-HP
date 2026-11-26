import Image from 'next/image';
import Link from 'next/link';
import { corporateProducts } from '@/data/corporateProducts';

type CorporateProductListProps = {
  layout?: 'carousel' | 'stacked';
};

export function CorporateProductList({ layout = 'carousel' }: CorporateProductListProps) {
  return (
    <div
      className={layout === 'stacked' ? 'corporate-product-list-stacked' : 'corporate-home-product-grid'}
      role="list"
      aria-label="プロダクト一覧"
      tabIndex={layout === 'carousel' ? 0 : undefined}
    >
      {corporateProducts.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.id}`}
          className="corporate-home-product-card"
          role="listitem"
        >
          <div className="corporate-home-product-thumbnail" aria-hidden={!product.thumbnail}>
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={`${product.title}の画面`}
                width={product.thumbnailWidth ?? 1306}
                height={product.thumbnailHeight ?? 740}
                className="corporate-home-product-thumbnail-image"
              />
            ) : null}
          </div>
          <div className="corporate-home-product-card-body">
            <h3>{product.title}</h3>
            <p>{product.summary}</p>
            <div className="corporate-home-product-card-footer">
              <strong>詳しく見る</strong>
              <span className="corporate-product-category">{product.category}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
