/**
 * Template React Email para notificar un RSVP a los novios.
 * Renderizable desde Node.js o desde la edge function (npm:@react-email/components).
 *
 * Para previsualizar en local:
 *   npm run email:dev
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';

type GuestInfo = {
  fullName: string;
  attending: boolean | null;
  dietaryRestrictions: string | null;
};

type Props = {
  groupName: string;
  relationship?: string | null;
  guests: GuestInfo[];
  message?: string | null;
  songRequest?: string | null;
  adminUrl?: string;
};

export default function RsvpNotification(props: Props) {
  const yes = props.guests.filter((g) => g.attending === true);
  const no = props.guests.filter((g) => g.attending === false);

  return (
    <Html lang="es">
      <Head />
      <Preview>{`${props.groupName} confirmo: ${yes.length} asisten, ${no.length} declinan`}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f7f7f7', margin: 0, padding: '24px' }}>
        <Container style={{ background: '#fff', padding: 24, borderRadius: 8, maxWidth: 600 }}>
          <Heading style={{ fontFamily: 'Georgia, serif', marginTop: 0 }}>
            Nueva confirmacion de RSVP
          </Heading>
          <Text style={{ color: '#666', marginTop: 0 }}>
            <strong>{props.groupName}</strong>
            {props.relationship ? ` · ${props.relationship}` : ''}
          </Text>

          <Hr style={{ margin: '16px 0' }} />

          <Section>
            <Heading as="h3" style={{ fontSize: 16 }}>
              Asisten ({yes.length})
            </Heading>
            {yes.length > 0 ? (
              yes.map((g, i) => (
                <Text key={i} style={{ margin: '4px 0' }}>
                  • {g.fullName}
                  {g.dietaryRestrictions ? ` — ${g.dietaryRestrictions}` : ''}
                </Text>
              ))
            ) : (
              <Text style={{ color: '#999' }}>Nadie del grupo asiste.</Text>
            )}
          </Section>

          {no.length > 0 && (
            <Section style={{ marginTop: 16 }}>
              <Heading as="h3" style={{ fontSize: 16 }}>
                No asisten ({no.length})
              </Heading>
              {no.map((g, i) => (
                <Text key={i} style={{ margin: '4px 0' }}>
                  • {g.fullName}
                </Text>
              ))}
            </Section>
          )}

          {props.message && (
            <Section style={{ marginTop: 16 }}>
              <Heading as="h3" style={{ fontSize: 16 }}>
                Mensaje
              </Heading>
              <Text>{props.message}</Text>
            </Section>
          )}

          {props.songRequest && (
            <Section style={{ marginTop: 16 }}>
              <Heading as="h3" style={{ fontSize: 16 }}>
                Cancion sugerida
              </Heading>
              <Text>{props.songRequest}</Text>
            </Section>
          )}

          {props.adminUrl && (
            <>
              <Hr style={{ margin: '24px 0 16px' }} />
              <Text>
                <Link href={props.adminUrl}>Ver detalle en el panel</Link>
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}
