import { Helmet } from 'react-helmet-async';

type SeoProps = {
  title: string;
  description: string;
};

export function Seo({ title, description }: SeoProps) {
  return (
    <Helmet>
      <title>{`${title} | KSEF AI`}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
}
