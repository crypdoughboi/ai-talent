import { ButtonLink, Section } from "@/components/ui";

export default function NotFound() {
  return (
    <Section className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <div className="eyebrow">404</div>
      <h1 className="mt-3 text-[40px] font-semibold tracking-tight sm:text-[56px]">
        Nothing to <span className="serif-accent text-signal">operate</span> here.
      </h1>
      <p className="mt-3 max-w-md text-muted">The page doesn&rsquo;t exist, or you don&rsquo;t have access to it.</p>
      <div className="mt-8 flex gap-2">
        <ButtonLink href="/">Go home</ButtonLink>
        <ButtonLink href="/operators" variant="secondary">Browse operators</ButtonLink>
      </div>
    </Section>
  );
}
